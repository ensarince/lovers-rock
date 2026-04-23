import PocketBase from 'pocketbase';
import { getPocketBaseUrl } from '../utils/helperFunctions';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const POCKETBASE_URL = getPocketBaseUrl();
let pb = new PocketBase(POCKETBASE_URL);

// Module-level resolver kept alive across auth session dismissal so the
// global Linking listener in _layout.tsx can deliver late-arriving OAuth URLs.
let pendingOAuthDeepLink: ((url: string) => void) | null = null;

export function deliverOAuthDeepLink(url: string): boolean {
  if (pendingOAuthDeepLink) {
    pendingOAuthDeepLink(url);
    pendingOAuthDeepLink = null;
    return true;
  }
  return false;
}

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

  // Google OAuth login — openAuthSessionAsync + persistent deep link fallback.
  //
  // Normal flow (fingerprint / instant redirect):
  //   openAuthSessionAsync returns {type:'success', url} → done.
  //
  // Security challenge flow (number matching, cross-device verification):
  //   Tapping the challenge number causes the auth session to return 'dismiss'
  //   BEFORE the relay redirect arrives. We keep a module-level resolver alive
  //   so the global Linking listener in _layout.tsx can deliver the URL even
  //   after the auth session has already closed. We wait up to 10 seconds.
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

      // Shared resolver — set before opening browser so both the inline Linking
      // listener AND the global _layout.tsx listener can resolve it.
      let sharedResolve: ((url: string) => void) | null = null;
      const deepLinkPromise = new Promise<string>((resolve) => {
        sharedResolve = resolve;
        pendingOAuthDeepLink = resolve; // expose to global listener
      });

      const linkSub = Linking.addEventListener('url', ({ url }) => {
        if (url.startsWith(deepLinkBase) && sharedResolve) {
          sharedResolve(url);
          sharedResolve = null;
          pendingOAuthDeepLink = null;
        }
      });

      let callbackUrl: string;
      try {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, deepLinkBase);

        if (result.type === 'success' && result.url?.startsWith(deepLinkBase)) {
          // Normal path — auth session captured the redirect URL directly
          callbackUrl = result.url;
          sharedResolve = null;
          pendingOAuthDeepLink = null;
        } else if (result.type === 'dismiss' || result.type === 'cancel') {
          // Challenge path — the auth session closed before the redirect arrived.
          // Wait up to 10 s; the global _layout.tsx listener will deliver the URL
          // if it comes in after the inline listener is removed below.
          const raceResult = await Promise.race([
            deepLinkPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);
          pendingOAuthDeepLink = null;
          if (!raceResult) throw new Error('Google sign-in was cancelled');
          callbackUrl = raceResult;
        } else {
          pendingOAuthDeepLink = null;
          throw new Error('OAuth did not complete: ' + result.type);
        }
      } finally {
        linkSub.remove();
      }

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get('code');
      const returnedState = parsed.searchParams.get('state');
      const oauthError = parsed.searchParams.get('error');

      if (oauthError) throw new Error('OAuth error: ' + oauthError);
      if (returnedState !== state) throw new Error('OAuth state mismatch — possible CSRF');
      if (!code) throw new Error('No authorization code received');

      const authData = await pb.collection('users').authWithOAuth2Code(
        'google', code, provider.codeVerifier, relayUri,
      );

      return authData;
    } catch (error: any) {
      pendingOAuthDeepLink = null;
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
