import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { darkMode, user, unreadMessageCount } = useAuth();
  const router = useRouter();
  const theme = darkMode ? themeDark : themeLight;
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom - 6, 4);

  // Redirect to profile if profile is not completed, except when on profile screen
  useEffect(() => {
    if (user && !user.profile_completed) {
      // Keep modal at root level - it will prevent navigation
      // This is just a safety measure
    }
  }, [user?.profile_completed, router]);

  return (
    <>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? '#252A34' : '#FAFBFC'}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: tabBarPaddingBottom,
            height: 56 + tabBarPaddingBottom,
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'compass' : 'compass-outline'}
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'heart' : 'heart-outline'} color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'message' : 'message-outline'} color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} color={color} size={26} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}



