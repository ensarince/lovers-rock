import { Text, View } from '@/components/Themed';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { getMatches, Match } from '@/src/services/matchData';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
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
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user, token } = useAuth();

  const isProfileComplete = user &&
    user.name &&
    typeof user.age === 'number' &&
    user.grade &&
    Array.isArray(user.climbing_styles) && user.climbing_styles.length > 0 &&
    user.home_gym &&
    user.bio &&
    user.email;

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        if (!token || !user?.id) return;
        const data = await getMatches(token, user.id);
        setMatches(data);
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) {
      fetchMatches();
    }
  }, [token, user?.id]);

  if (loading) {
    return (
      <View style={styles.centerContainerMinimal}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centerContainerMinimal}>
        <Ionicons name="heart-outline" size={44} color="#a1a1aa" style={{ backgroundColor: '#23232a', borderRadius: 16, padding: 8 }} />
        <Text style={styles.titleMinimal}>No matches yet</Text>
        <Text style={styles.subtitleMinimal}>
          Go discover climbers you like!
        </Text>
      </View>
    );
  }

  if (!isProfileComplete) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ec4899" />
        <Text style={styles.emptyTitle}>Complete your profile</Text>
        <Text style={styles.emptySubtitle}>
          Please fill out your profile before viewing matches.
        </Text>
        {/* Optionally, add a button to navigate to Edit Profile */}
      </View>
    );
  }

  const handleMatchPress = (match: Match) => {
    setSelectedMatch(match);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
  };

  const handleMessage = (match: Match) => {
    // Navigate directly to chat screen
    setModalVisible(false);
    router.push({
      pathname: '/chat',
      params: {
        matchId: match.id,
        climberName: match.climber.name,
        climberId: match.climber.id
      }
    });
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <Pressable style={styles.matchCardMinimal} onPress={() => handleMatchPress(item)}>
      <Image
        source={{ uri: item.climber.image_url }}
        style={styles.matchImageMinimal}
      />

      <View style={styles.matchInfoMinimal}>
        <View style={styles.matchHeaderMinimal}>
          <View style={{ backgroundColor: "transparent" }}>
            <Text style={styles.matchNameMinimal}>
              {item.climber.name}, {item.climber.age}
            </Text>
            <Text style={styles.matchGymMinimal}>{item.climber.home_gym}</Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadgeMinimal}>
              <Text style={styles.unreadTextMinimal}>{item.unreadCount}</Text>
            </View>
          )}
        </View>

        <Text style={styles.messagePreviewMinimal} numberOfLines={1}>
          {item.messagePreview || 'No messages yet'}
        </Text>

        <Text style={styles.matchedTimeMinimal}>
          Matched{' '}
          {Math.floor((Date.now() - item.matchedAt) / (1000 * 60 * 60))}h ago
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
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

      <MatchDetailModal
        visible={modalVisible}
        match={selectedMatch}
        onClose={handleCloseModal}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainerMinimal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  matchCardMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    marginHorizontal: 18,
    marginVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  matchImageMinimal: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
  },
  matchInfoMinimal: {
    flex: 1,
    backgroundColor: "transparent"
  },
  matchHeaderMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    backgroundColor: "transparent"
  },
  matchNameMinimal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  matchGymMinimal: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  unreadBadgeMinimal: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadTextMinimal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messagePreviewMinimal: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 4,
  },
  matchedTimeMinimal: {
    fontSize: 11,
    color: '#a1a1aa',
  },
  titleMinimal: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
    color: '#fff',
    letterSpacing: 1.1,
  },
  subtitleMinimal: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#fff',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 4,
  },
});
