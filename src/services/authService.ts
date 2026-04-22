import PocketBase from 'pocketbase';
import { getPocketBaseUrl } from '../utils/helperFunctions';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const POCKETBASE_URL = getPocketBaseUrl();
let pb = new PocketBase(POCKETBASE_URL);

// Verify PocketBase connection on startup
const verifyConnection = async () => {
  if (process.env.EXPO_DEV_MODE) console.log('🔍 Attempting to connect to:', POCKETBASE_URL);
  try {
    if (process.env.EXPO_DEV_MODE) console.log('📡 Sending fetch request...');
    const response = await fetch(`${POCKETBASE_URL}/api/health`, {
      method: 'GET',
    });
    if (process.env.EXPO_DEV_MODE) console.log('📊 Response received:', response.status, response.statusText);
    if (response.ok) {
      if (process.env.EXPO_DEV_MODE) console.log('✓ Connected to PocketBase');
    } else {
      if (process.env.EXPO_DEV_MODE) console.warn('⚠ PocketBase responded with status:', response.status);
    }
  } catch (error: any) {
    if (process.env.EXPO_DEV_MODE) {
      console.error('✗ Fetch failed');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('URL attempted:', POCKETBASE_URL);
    }
  }
};

verifyConnection();

export const authService = {
  // Register with email/password
  async register(email: string, password: string, passwordConfirm: string) {
    try {
      const data = await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        intent: ['date', 'partner'], // Default both enabled
      });
      // Clear auth store so user is not auto-logged in
      pb.authStore.clear();
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  // Login with email/password
  async login(email: string, password: string) {
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword(email, password);
      if (process.env.EXPO_DEV_MODE) console.log('✓ Login successful');
      return authData;
    } catch (error: any) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Login error:', error);
      if (process.env.EXPO_DEV_MODE) console.error('Error response:', error.response);
      throw new Error(error.message || 'Invalid email or password');
    }
  },

  // Google OAuth login — openBrowserAsync + Linking listener approach.
  // openAuthSessionAsync uses Chrome Custom Tabs "auth session" mode which closes
  // prematurely when Google triggers security challenges (number matching, cross-device
  // verification). openBrowserAsync lets the user complete any challenge; we catch
  // the loversrock:// deep link independently via Linking.addEventListener.
  async loginWithGoogle() {
    try {
      const authMethods = await pb.collection('users').listAuthMethods();
      const provider = (authMethods as any).oauth2?.providers?.find((p: any) => p.name === 'google');
      if (!provider) throw new Error('Google OAuth not configured in PocketBase');

      const relayUri = `${POCKETBASE_URL}/api/mobile-oauth-callback`;
      const deepLinkBase = Linking.createURL('oauth'); // 'loversrock://oauth'
      const state = provider.state as string;

      let authUrl: string;
      if (provider.authUrl.includes('redirect_uri=')) {
        authUrl = provider.authUrl.replace(/redirect_uri=[^&]*/, `redirect_uri=${encodeURIComponent(relayUri)}`);
      } else {
        const sep = provider.authUrl.includes('?') ? '&' : '?';
        authUrl = provider.authUrl + sep + 'redirect_uri=' + encodeURIComponent(relayUri);
      }

      const authData = await new Promise<any>((resolve, reject) => {
        let settled = false;
        let linkSub: ReturnType<typeof Linking.addEventListener> | null = null;

        const done = () => {
          settled = true;
          linkSub?.remove();
          linkSub = null;
        };

        // Listen for the loversrock://oauth deep link from our relay
        linkSub = Linking.addEventListener('url', async ({ url }) => {
          if (!url.startsWith(deepLinkBase) || settled) return;
          done();
          WebBrowser.dismissBrowser();
          try {
            const parsed = new URL(url);
            const code = parsed.searchParams.get('code');
            const returnedState = parsed.searchParams.get('state');
            const oauthError = parsed.searchParams.get('error');

            if (oauthError) { reject(new Error('OAuth error: ' + oauthError)); return; }
            if (returnedState !== state) { reject(new Error('OAuth state mismatch — possible CSRF')); return; }
            if (!code) { reject(new Error('No authorization code received')); return; }

            const result = await pb.collection('users').authWithOAuth2Code(
              'google', code, provider.codeVerifier, relayUri,
            );
            resolve(result);
          } catch (err: any) {
            reject(new Error(err.message || 'Authentication failed'));
          }
        });

        // Open browser — resolves when tab is closed (user cancelled or deep link navigated away)
        WebBrowser.openBrowserAsync(authUrl).then(() => {
          if (settled) return;
          done();
          reject(new Error('Google sign-in was cancelled'));
        }).catch((err: any) => {
          if (settled) return;
          done();
          reject(new Error(err.message || 'Failed to open sign-in browser'));
        });
      });

      return authData;
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    }
  },
  // Request email verification (sends verification email)
  async requestVerification(email: string) {
    try {
      if (process.env.EXPO_DEV_MODE) console.log('📧 Requesting verification for:', email);
      await pb.collection('users').requestVerification(email);
      if (process.env.EXPO_DEV_MODE) console.log('✓ Verification email requested');
    } catch (error: any) {
      if (process.env.EXPO_DEV_MODE) {
        console.error('❌ Verification request error:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', error.response || error);
      }
      throw new Error(error.message || 'Failed to send verification email');
    }
  },

  // Confirm email verification with token
  async confirmVerification(token: string) {
    try {
      if (process.env.EXPO_DEV_MODE) console.log('🔐 Confirming verification with token');
      await pb.collection('users').confirmVerification(token);
      if (process.env.EXPO_DEV_MODE) console.log('✓ Email verified successfully');
    } catch (error: any) {
      if (process.env.EXPO_DEV_MODE) {
        console.error('❌ Verification confirm error:', error);
        console.error('Error message:', error.message);
      }
      throw new Error(error.message || 'Invalid or expired verification token');
    }
  },

  // Logout
  logout() {
    pb.authStore.clear();
  },

  // Get current user
  getCurrentUser() {
    return pb.authStore.record;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return pb.authStore.isValid;
  },

  // Get auth token
  getToken() {
    return pb.authStore.token;
  },
};

export default pb;
