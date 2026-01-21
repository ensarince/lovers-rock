import { ProfileCompletionModal } from '@/src/components/ProfileCompletionModal';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
      // Show modal only if profile is not completed AND user has minimal required fields empty
      const hasRequiredFields = user.name && user.age && user.avatar && user.grade && user.home_gym && user.bio && user.climbing_styles?.length > 0;
      const profileNotCompleted = !user.profile_completed;
      
      if (profileNotCompleted && !hasRequiredFields) {
        setShowProfileCompletion(true);
      } else {
        setShowProfileCompletion(false);
      }
    } else {
      setShowProfileCompletion(false);
    }
  }, [isAuthenticated, user?.profile_completed, user?.name, user?.age, user?.avatar, user?.home_gym, user?.bio, user?.climbing_styles]);

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ProfileCompletionModal
        visible={showProfileCompletion}
        user={user}
        onComplete={handleProfileComplete}
        darkMode={darkMode}
      />
      <Stack
        screenOptions={{ headerShown: false }}
        key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
      >
        {isAuthenticated ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </ThemeProvider>
  );
}
