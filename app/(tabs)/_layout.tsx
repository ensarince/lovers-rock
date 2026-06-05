import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Compass, Heart, MessageCircle, User } from 'lucide-react-native';
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
            <Compass size={24} color={color} strokeWidth={focused ? 2.5 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <Heart size={24} color={color} fill={focused ? color : 'none'} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <MessageCircle size={24} color={color} fill={focused ? color : 'none'} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={24} color={color} fill={focused ? color : 'none'} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}



