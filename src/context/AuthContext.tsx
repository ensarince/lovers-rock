import { authService } from '@/src/services/authService';
import { preferenceService } from '@/src/services/preferenceService';
import { Climber } from '@/src/types/climber';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: Climber | null;
  setUser: React.Dispatch<React.SetStateAction<Climber | null>>;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  preferencesSynced: boolean;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  //loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Climber | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferencesSynced, setPreferencesSynced] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Helper to map any record to Climber type with defaults
  const mapToClimber = (record: any): Climber => ({
    id: record.id,
    name: record.name || '',
    age: typeof record.age === 'number' ? record.age : 0,
    grade: record.grade || 'beginner',
    climbing_styles: Array.isArray(record.climbing_styles) ? record.climbing_styles : [],
    home_gym: record.home_gym || '',
    bio: record.bio || '',
    email: record.email || '',
    avatar: record.avatar || '',
    intent: Array.isArray(record.intent) ? record.intent : [],
  });

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      // Try to restore from AsyncStorage first
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');
        const storedDarkMode = await AsyncStorage.getItem('darkMode');

        if (storedDarkMode) {
          setDarkMode(JSON.parse(storedDarkMode));
        }

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser ? mapToClimber(parsedUser) : null);
          setToken(storedToken);
          // Reset preferences and sync for existing user
          if (parsedUser && storedToken) {
            preferenceService.reset();
            await preferenceService.syncPreferences(storedToken, parsedUser.id);
            setPreferencesSynced(true);
          }
        } else if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          const currentToken = authService.getToken?.() || null;
          setUser(currentUser ? mapToClimber(currentUser) : null);
          setToken(currentToken);
          // Reset preferences and sync for existing user
          if (currentUser && currentToken) {
            preferenceService.reset();
            await preferenceService.syncPreferences(currentToken, currentUser.id);
            setPreferencesSynced(true);
          }
        }
      } catch (err) {
        // Optionally log error
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setPreferencesSynced(false);
    try {
      const authData = await authService.login(email, password);
      
      // Check if email is verified (PocketBase uses 'verified' field)
      if (!authData.record.verified) {
        throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      }
      
      const climberUser = mapToClimber(authData.record);
      setUser(climberUser);
      setToken(authData.token);
      await AsyncStorage.setItem('user', JSON.stringify(climberUser));
      await AsyncStorage.setItem('token', authData.token);
      // Reset preferences and sync for the new user
      preferenceService.reset();
      await preferenceService.syncPreferences(authData.token, authData.record.id);
      setPreferencesSynced(true);
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    /* setIsLoading(true) */;
    try {
      await authService.register(email, password, password);
      // Don't auto-login after register - let the user verify email first
      // User will login after verification
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.message || 'Registration failed';
      throw new Error(errorMessage);
    } /* finally {
      setIsLoading(false);
    } */
  };

  /* const loginWithGoogle = async () => {
    setPreferencesSynced(false);
    try {
      const authData = await authService.loginWithGoogle();
      const climberUser = mapToClimber(authData.record);
      setUser(climberUser);
      setToken(authData.token);
      await AsyncStorage.setItem('user', JSON.stringify(climberUser));
      await AsyncStorage.setItem('token', authData.token);
      // Reset preferences and sync for the new user
      preferenceService.reset();
      await preferenceService.syncPreferences(authData.token, authData.record.id);
      setPreferencesSynced(true);
      setIsLoading(true);
      setIsLoading(false);
    } catch (error) {
      throw error;
    }
  }; */

  const logout = async () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setPreferencesSynced(false);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    // Reset preference service when logging out
    preferenceService.reset();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        isAuthenticated: user !== null,
        token,
        preferencesSynced,
        darkMode,
        setDarkMode,
        login,
        register,
        /* loginWithGoogle, */
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
