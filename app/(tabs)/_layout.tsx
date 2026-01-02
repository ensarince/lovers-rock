import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
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
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}




