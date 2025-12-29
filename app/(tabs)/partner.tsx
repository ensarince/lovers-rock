import { useAuth } from '@/src/context/AuthContext';
import { getAllAccounts } from '@/src/services/accountService';
import { theme } from '@/src/theme';
import { Climber } from '@/src/types/climber';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function PartnerScreen() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState<Climber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        if (!token) return;
        const data = await getAllAccounts(token);
        // Only show users with 'partner' intent, exclude self
        const filtered = data.filter(
          (c) => c.id !== user?.id && Array.isArray(c.intent) && c.intent.includes('partner')
        );
        setPartners(filtered);
        setError(null);
      } catch (e) {
        setError('Failed to load partners');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPartners();
  }, [token, user?.id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!user?.intent || (Array.isArray(user.intent) ? !user.intent.includes('partner') : user.intent !== 'partner')) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Enable "Climbing Partner" in your profile to use this page.</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a Climbing Partner</Text>
      <FlatList
        data={partners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>Gym: {item.home_gym}</Text>
            <Text style={styles.detail}>Grade: {item.grade}</Text>
            <Text style={styles.detail}>Styles: {Array.isArray(item.climbing_styles) ? item.climbing_styles.join(', ') : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.errorText}>No partners found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
});
