import PocketBase from 'pocketbase';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
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

  // Google OAuth login
  /*   async loginWithGoogle() {
      try {
        const authData = await pb
          .collection('users')
          .authWithOAuth2({ provider: 'google' });
        return authData;
      } catch (error: any) {
        throw new Error(error.message || 'Google login failed');
      }
    },
   */
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
