import PocketBase from 'pocketbase';
import { getPocketBaseUrl } from '../utils/helperFunctions';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const POCKETBASE_URL = getPocketBaseUrl();
let pb = new PocketBase(POCKETBASE_URL);

// Module-level handler so the global Linking listener in _layout.tsx can
// deliver deep link URLs to whichever loginWithGoogle() call is in flight.
let pendingOAuthDeepLink: ((url: string) => void) | null = null;

export function deliverOAuthDeepLink(url: string): boolean {
  if (pendingOAuthDeepLink) {
    pendingOAuthDeepLink(url);
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

  // Google OAuth login — server-side code store + polling, with Linking fast path.
  //
  // Android 10+ blocks Chrome Custom Tab (backgrounded) from launching a new-activity
  // Intent, so loversrock://oauth never arrives via Linking when the user leaves Chrome
  // to approve a number-matching challenge in Google app.
  //
  // Fix: the Railway relay now stores the code server-side. The app polls every 1.5 s.
  // The Linking listener is kept as a fast path for fingerprint / instant-redirect flows.
  // After the browser closes, we poll for 3 more seconds before declaring cancellation.
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

      const code = await new Promise<string>((resolve, reject) => {
        let settled = false;
        let browserClosedAt: number | null = null;
        let linkSub: ReturnType<typeof Linking.addEventListener> | null = null;

        const deliver = (c: string) => {
          if (settled) return;
          settled = true;
          linkSub?.remove();
          linkSub = null;
          pendingOAuthDeepLink = null;
          WebBrowser.dismissBrowser();
          resolve(c);
        };

        const cancel = (msg: string) => {
          if (settled) return;
          settled = true;
          linkSub?.remove();
          linkSub = null;
          pendingOAuthDeepLink = null;
          reject(new Error(msg));
        };

        // Fast path: Linking (works when Chrome can deliver the Intent directly)
        linkSub = Linking.addEventListener('url', ({ url }) => {
          if (!url.startsWith(deepLinkBase)) return;
          const p = new URL(url);
          const err = p.searchParams.get('error');
          if (err) { cancel('OAuth error: ' + err); return; }
          const c = p.searchParams.get('code');
          const s = p.searchParams.get('state');
          if (s !== state) { cancel('OAuth state mismatch — possible CSRF'); return; }
          if (c) deliver(c);
        });

        pendingOAuthDeepLink = (url: string) => {
          if (url.startsWith(deepLinkBase)) {
            const p = new URL(url);
            const c = p.searchParams.get('code');
            if (c) deliver(c);
          }
        };

        // Open browser — non-auth-session so Chrome stays alive through challenges
        WebBrowser.openBrowserAsync(authUrl).then(() => {
          browserClosedAt = Date.now();
        }).catch((err: any) => {
          cancel(err.message || 'Failed to open sign-in browser');
        });

        // Reliable path: poll the server-side code store every 1.5 s
        (async () => {
          while (!settled) {
            await new Promise(r => setTimeout(r, 1500));
            if (settled) break;

            // Browser closed — give 3 s grace for the poll to find the code
            if (browserClosedAt !== null && Date.now() - browserClosedAt > 3000) {
              cancel('Google sign-in was cancelled');
              break;
            }

            try {
              const resp = await fetch(
                `${POCKETBASE_URL}/api/oauth-code-poll?state=${encodeURIComponent(state)}`
              );
              if (resp.ok) {
                const data = await resp.json();
                if (data.found && data.code) { deliver(data.code); break; }
              }
            } catch { /* network blip — retry next tick */ }
          }
        })();
      });

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
