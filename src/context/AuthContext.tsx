import { authService } from '@/src/services/authService';
import { createDefaultGrade } from '@/src/services/gradeService';
import { locationService } from '@/src/services/locationService';
import { NotificationService } from '@/src/services/notificationService';
import { preferenceService } from '@/src/services/preferenceService';
import { initReportService } from '@/src/services/reportService';
import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl, normalizeIntentValue } from '@/src/utils/helperFunctions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import PocketBase from 'pocketbase';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Import conditionally to avoid Expo Go issues on Android
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  // expo-notifications not available in Expo Go
  if (process.env.EXPO_DEV_MODE) {
    console.warn('expo-notifications not available:', error);
  }
}

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
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let notificationService: NotificationService | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Climber | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferencesSynced, setPreferencesSynced] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Initialize notification listeners when component mounts
  useEffect(() => {
    if (!Notifications) return;

    // Listen for notification responses (when user taps on notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        handleNotificationResponse(response);
      }
    );

    // Cleanup listener on unmount
    return () => {
      if (responseListener?.remove) {
        responseListener.remove();
      }
    };
  }, []);

  const handleNotificationResponse = async (
    response: any
  ) => {
    const data = response.notification.request.content.data;
    // You can navigate based on notification type here if needed
    // For now, just log it
    if (process.env.EXPO_DEV_MODE) {
      console.log('Notification tapped:', data);
    }
  };

  /**
   * Setup notification service for the user
   */
  const setupNotifications = async (userId: string, pb: PocketBase) => {
    try {
      notificationService = new NotificationService(pb, userId);

      // Request notification permissions
      const permissionGranted = await notificationService.requestPermissions();
      if (process.env.EXPO_DEV_MODE) {
        console.log('Notification permissions granted:', permissionGranted);
      }

      // Setup real-time listeners
      await notificationService.setupRealtimeListeners();
      if (process.env.EXPO_DEV_MODE) {
        console.log('Real-time notification listeners set up');
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  /**
   * Cleanup notification service
   */
  const cleanupNotifications = () => {
    if (notificationService) {
      notificationService.cleanup();
      notificationService = null;
    }
  };

  // Initialize ReportService on app start
  useEffect(() => {
    try {
      const pb = new PocketBase(getPocketBaseUrl());
      initReportService(pb);
    } catch (error) {
      console.error('Failed to initialize ReportService:', error);
    }
  }, []);

  // Helper to map any record to Climber type with defaults
  const mapToClimber = (record: any): Climber => {
    let parsedGrade = createDefaultGrade();
    if (record.grade) {
      if (typeof record.grade === 'string') {
        try {
          parsedGrade = JSON.parse(record.grade);
        } catch {
          parsedGrade = createDefaultGrade();
        }
      } else {
        parsedGrade = record.grade;
      }
    }

    return {
      id: record.id,
      name: record.name || '',
      age: typeof record.age === 'number' ? record.age : 0,
      verified: record.verified || false,
      gender: record.gender || undefined,
      grade: parsedGrade,
      climbing_styles: Array.isArray(record.climbing_styles) ? record.climbing_styles : [],
      home_gym: record.home_gym || '',
      bio: record.bio || '',
      email: record.email || '',
      avatar: record.avatar || '',
      images: Array.isArray(record.images) ? record.images : [],
      intent: Array.isArray(record.intent)
        ? record.intent.map((value: string) => normalizeIntentValue(value)).filter(Boolean) as Array<'date' | 'partner'>
        : [],
      latitude: typeof record.latitude === 'number' ? record.latitude : undefined,
      longitude: typeof record.longitude === 'number' ? record.longitude : undefined,
      last_location_update: record.last_location_update || undefined,
      profile_completed: record.profile_completed || false,
      blocked_users: Array.isArray(record.blocked_users) ? record.blocked_users : [],
    };
  };

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      // Try to restore from AsyncStorage first
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await SecureStore.getItemAsync('token');
        const storedDarkMode = await AsyncStorage.getItem('darkMode');

        if (storedDarkMode) {
          setDarkMode(JSON.parse(storedDarkMode));
        }

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser ? mapToClimber(parsedUser) : null);
          setToken(storedToken);
          
          // Setup notifications for restored user
          const pb = new PocketBase(getPocketBaseUrl());
          pb.authStore.save(storedToken, parsedUser);
          await setupNotifications(parsedUser.id, pb);
          
          // Refresh user data from PocketBase to ensure latest profile_completed status
          try {
            const POCKETBASE_URL = getPocketBaseUrl();
            const freshUserRes = await fetch(
              `${POCKETBASE_URL}/api/collections/users/records/${parsedUser.id}`,
              {
                headers: {
                  Authorization: `Bearer ${storedToken}`,
                },
              }
            );
            if (freshUserRes.ok) {
              const freshUserData = await freshUserRes.json();
              const freshClimber = mapToClimber(freshUserData);
              setUser(freshClimber);
              await AsyncStorage.setItem('user', JSON.stringify(freshClimber));
            }
          } catch (err) {
            // Silently fail if refresh doesn't work, use stored data
          }
          
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
          
          // Setup notifications for authenticated user
          if (currentUser && currentToken) {
            const pb = new PocketBase(getPocketBaseUrl());
            pb.authStore.save(currentToken, currentUser);
            await setupNotifications(currentUser.id, pb);
          }
          
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
          await SecureStore.setItemAsync('token', authData.token);
      
      // Setup notifications for logged-in user
      const pb = new PocketBase(getPocketBaseUrl());
      pb.authStore.save(authData.token, authData.record);
      await setupNotifications(authData.record.id, pb);
      
      // Reset preferences and sync for the new user
      preferenceService.reset();
      await preferenceService.syncPreferences(authData.token, authData.record.id);
      setPreferencesSynced(true);
      
      // Location tracking will be started in the discover screen after 3 seconds
      
      // Fetch fresh user data
      const POCKETBASE_URL = getPocketBaseUrl();
      setTimeout(async () => {
        try {
          const updatedUserRes = await fetch(
            `${POCKETBASE_URL}/api/collections/users/records/${authData.record.id}`,
            {
              headers: {
                Authorization: `Bearer ${authData.token}`,
              },
            }
          );
          if (updatedUserRes.ok) {
            const updatedUserData = await updatedUserRes.json();
            const updatedClimber = mapToClimber(updatedUserData);
            
            // Check if user has completed profile (all required fields filled)
            const hasCompleteProfile = updatedUserData.name && 
                                      updatedUserData.age && 
                                      updatedUserData.home_gym && 
                                      updatedUserData.bio && 
                                      (Array.isArray(updatedUserData.images) && updatedUserData.images.length > 0) &&
                                      updatedUserData.grade &&
                                      updatedUserData.climbing_styles?.length > 0;
            
            // If profile is complete but not marked, mark it as completed
            if (hasCompleteProfile && !updatedUserData.profile_completed) {
              try {
                await fetch(
                  `${POCKETBASE_URL}/api/collections/users/records/${authData.record.id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${authData.token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ profile_completed: true }),
                  }
                );
                updatedClimber.profile_completed = true;
              } catch (err) {
                // Silently fail
              }
            }
            
            setUser(updatedClimber);
            await AsyncStorage.setItem('user', JSON.stringify(updatedClimber));
          }
        } catch (err) {
          // Silently fail
        }
      }, 2000);
      
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

  const loginWithGoogle = async () => {
    setPreferencesSynced(false);
    try {
      const authData = await authService.loginWithGoogle();
      const climberUser = mapToClimber(authData.record);
      setUser(climberUser);
      setToken(authData.token);
      await AsyncStorage.setItem('user', JSON.stringify(climberUser));
      await SecureStore.setItemAsync('token', authData.token);

      const pb = new PocketBase(getPocketBaseUrl());
      pb.authStore.save(authData.token, authData.record);
      await setupNotifications(authData.record.id, pb);

      // Reset preferences and sync for the new user
      preferenceService.reset();
      await preferenceService.syncPreferences(authData.token, authData.record.id);
      setPreferencesSynced(true);

      try {
        const POCKETBASE_URL = getPocketBaseUrl();
        const updatedUserRes = await fetch(
          `${POCKETBASE_URL}/api/collections/users/records/${authData.record.id}`,
          {
            headers: {
              Authorization: `Bearer ${authData.token}`,
            },
          }
        );
        if (updatedUserRes.ok) {
          const updatedUserData = await updatedUserRes.json();
          const updatedClimber = mapToClimber(updatedUserData);
          setUser(updatedClimber);
          await AsyncStorage.setItem('user', JSON.stringify(updatedClimber));
        }
      } catch (err) {
        // non-fatal — user is already logged in with initial auth data
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    // Stop location tracking when logging out
    locationService.stopPeriodicLocationUpdates();
    
    // Clean up notifications
    cleanupNotifications();
    
    authService.logout();
    setUser(null);
    setToken(null);
    setPreferencesSynced(false);
    await AsyncStorage.removeItem('user');
    await SecureStore.deleteItemAsync('token');
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
        loginWithGoogle,
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
