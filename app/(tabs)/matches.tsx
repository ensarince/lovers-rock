import { Text, View } from '@/components/Themed';
import { getMatches, Match } from '@/src/services/matchData';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
} from 'react-native';

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const data = await getMatches();
        setMatches(data);
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="heart-outline" size={48} color="#6b7280" />
        <Text style={styles.title}>No matches yet</Text>
        <Text style={styles.subtitle}>
          Go discover climbers you like!
        </Text>
      </View>
    );
  }

  const renderMatch = ({ item }: { item: Match }) => (
    <Pressable style={styles.matchCard}>
      <Image
        source={{ uri: item.climber.image_url }}
        style={styles.matchImage}
      />

      <View style={styles.matchInfo}>
        <View style={styles.matchHeader}>
          <View>
            <Text style={styles.matchName}>
              {item.climber.name}, {item.climber.age}
            </Text>
            <Text style={styles.matchGym}>{item.climber.home_gym}</Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>

        <Text style={styles.messagePreview} numberOfLines={1}>
          {item.messagePreview || 'No messages yet'}
        </Text>

        <Text style={styles.matchedTime}>
          Matched{' '}
          {Math.floor((Date.now() - item.matchedAt) / (1000 * 60 * 60))}h ago
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  listContent: {
    paddingVertical: 8,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
  },
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchGym: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 6,
  },
  matchedTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
