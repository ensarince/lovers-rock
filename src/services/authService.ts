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

  // Google OAuth login — deep link approach (no SSE, no proxy timeout issues)
  async loginWithGoogle() {
    try {
      console.log('🔵 [Google] Starting OAuth (deep link), PocketBase URL:', POCKETBASE_URL);

      // Get auth methods — includes PocketBase-generated PKCE code verifier + challenge
      const authMethods = await pb.collection('users').listAuthMethods();
      const provider = (authMethods as any).oauth2?.providers?.find((p: any) => p.name === 'google');
      if (!provider) throw new Error('Google OAuth not configured in PocketBase');

      // Deep link redirect: app.json has scheme "loversrock", so this = "loversrock://oauth"
      // Chrome Custom Tabs auto-close when they detect a non-https scheme.
      const redirectUri = Linking.createURL('oauth');
      console.log('🔵 [Google] redirectUri:', redirectUri);

      // provider.authUrl ends with "&redirect_uri=" (empty) — append our URI.
      // If it already has a redirect_uri param (e.g. from a different SDK version), replace it.
      let authUrl: string;
      if (provider.authUrl.includes('redirect_uri=')) {
        authUrl = provider.authUrl.replace(/redirect_uri=[^&]*/, `redirect_uri=${encodeURIComponent(redirectUri)}`);
      } else {
        authUrl = provider.authUrl + encodeURIComponent(redirectUri);
      }

      // Add CSRF state
      const state = Math.random().toString(36).substring(2, 15);
      authUrl += `&state=${encodeURIComponent(state)}`;

      console.log('🔵 [Google] Opening Custom Tab...');
      // openAuthSessionAsync opens Chrome Custom Tabs.
      // It auto-closes when the browser detects the "loversrock://" scheme.
      // result.url contains the full callback URL with code + state.
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      console.log('🔵 [Google] Auth session result type:', result.type);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Google sign-in was cancelled');
      }
      if (result.type !== 'success') {
        throw new Error('OAuth did not complete: ' + result.type);
      }

      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get('code');
      const returnedState = callbackUrl.searchParams.get('state');

      if (returnedState !== state) throw new Error('OAuth state mismatch — possible CSRF');
      if (!code) {
        const error = callbackUrl.searchParams.get('error');
        throw new Error('OAuth error: ' + (error || 'no code in callback'));
      }

      console.log('🔵 [Google] Got code, exchanging with PocketBase...');
      // Exchange code directly — no SSE involved, no Railway proxy timeout
      const authData = await pb.collection('users').authWithOAuth2Code(
        'google',
        code,
        provider.codeVerifier,
        redirectUri,
      );

      console.log('✅ [Google] Auth success, user id:', authData.record?.id);
      return authData;
    } catch (error: any) {
      console.error('❌ [Google] Error:', error.message, '| cause:', error.originalError?.message);
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
