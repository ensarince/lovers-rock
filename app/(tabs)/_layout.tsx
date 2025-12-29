import { useAuth } from '@/src/context/AuthContext';
import { theme } from '@/src/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const { user } = useAuth();
  // intent can be array or string
  const hasDatingIntent = Array.isArray(user?.intent)
    ? user.intent.includes('date')
    : typeof user?.intent === 'string'
      ? user.intent === 'date'
      : false;
  const hasPartnerIntent = Array.isArray(user?.intent)
    ? user.intent.includes('partner')
    : typeof user?.intent === 'string'
      ? user.intent === 'partner'
      : false;

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
        name="dating"
        options={{
          title: 'Dating',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              color={hasDatingIntent ? color : theme.colors.border}
              size={24}
              style={!hasDatingIntent ? { opacity: 0.4 } : {}}
            />
          ),
          tabBarActiveTintColor: hasDatingIntent ? theme.colors.accent : theme.colors.border,
          tabBarInactiveTintColor: hasDatingIntent ? theme.colors.textSecondary : theme.colors.border,
          tabBarLabelStyle: !hasDatingIntent ? { opacity: 0.4 } : {},
        }}
        listeners={
          !hasDatingIntent
            ? {
              tabPress: (e) => {
                e.preventDefault();
                alert('Enable "Dating" in your profile to use this page.');
              },
            }
            : undefined
        }
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={hasPartnerIntent ? color : theme.colors.border}
              size={24}
              style={!hasPartnerIntent ? { opacity: 0.4 } : {}}
            />
          ),
          tabBarActiveTintColor: hasPartnerIntent ? theme.colors.accent : theme.colors.border,
          tabBarInactiveTintColor: hasPartnerIntent ? theme.colors.textSecondary : theme.colors.border,
          tabBarLabelStyle: !hasPartnerIntent ? { opacity: 0.4 } : {},
        }}
        listeners={
          !hasPartnerIntent
            ? {
              tabPress: (e) => {
                e.preventDefault();
                alert('Enable "Climbing Partner" in your profile to use this page.');
              },
            }
            : undefined
        }
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


