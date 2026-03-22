import { ProfileCompletionModal } from '@/src/components/ProfileCompletionModal';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user, setUser, darkMode } = useAuth();
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  // Check if user needs to complete profile after login
  useEffect(() => {
    if (isAuthenticated && user) {
      // Show modal only if profile_completed is false (or missing/falsy)
      // This is the primary indicator from the database
      const shouldShowModal = !user.profile_completed;
      setShowProfileCompletion(shouldShowModal);
    } else {
      setShowProfileCompletion(false);
    }
  }, [isAuthenticated, user?.profile_completed]);

  const handleProfileComplete = (updatedUser: any) => {
    setUser(updatedUser);
    setShowProfileCompletion(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? '#252A34' : '#FAFBFC'}
      />
      <ThemeProvider value={DarkTheme}>
        <ProfileCompletionModal
          visible={showProfileCompletion}
          user={user}
          onComplete={handleProfileComplete}
          darkMode={darkMode}
        />
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName={isAuthenticated ? '(tabs)' : '(auth)'}
          key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </ThemeProvider>
    </>
  );
}
