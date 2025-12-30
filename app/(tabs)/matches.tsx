import { Text, View } from '@/components/Themed';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { getMatches } from '@/src/services/matchData';
import { theme } from '@/src/theme'; // Add import for theme
import { Match } from '@/src/types/match';
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

  // Split matches by type (assume backend provides match.type: 'dating' | 'partner')
  const hasDatingIntent = user && (Array.isArray(user.intent) ? user.intent.includes('date') : user.intent === 'date');
  const hasPartnerIntent = user && (Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner');
  const datingMatches = hasDatingIntent ? matches.filter(m => m.type === 'dating') : [];
  const partnerMatches = hasPartnerIntent ? matches.filter(m => m.type === 'partner') : [];

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

          // getMatches already returns mutual matches
          const allMatches = await getMatches(token, user.id);

          setMatches(allMatches);
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
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centerContainerMinimal}>
        <Ionicons name="heart-outline" size={44} color={theme.colors.textSecondary} style={{ backgroundColor: theme.colors.border, borderRadius: 16, padding: 8 }} />
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
        <Ionicons name="alert-circle" size={64} color={theme.colors.accent} />
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
        </View>

        <Text style={styles.messagePreviewMinimal} numberOfLines={1}>
          {item.messagePreview || 'No messages yet'}
        </Text>

        <Text style={styles.matchedTimeMinimal}>
          Matched{' '}
          {Math.floor((Date.now() - item.matchedAt) / (1000 * 60 * 60))}h ago
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Dating Matches Section (only if intent) */}
      {hasDatingIntent && (
        <>
          <Text style={[styles.titleMinimal, { marginLeft: 18, marginTop: 12 }]}>Dating Matches</Text>
          {datingMatches.length === 0 ? (
            <Text style={[styles.subtitleMinimal, { marginLeft: 18 }]}>No dating matches yet.</Text>
          ) : (
            <FlatList
              data={datingMatches}
              renderItem={renderMatch}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}

      {/* Partner Matches Section (only if intent) */}
      {hasPartnerIntent && (
        <>
          <Text style={[styles.titleMinimal, { marginLeft: 18, marginTop: 24 }]}>Partner Matches</Text>
          {partnerMatches.length === 0 ? (
            <Text style={[styles.subtitleMinimal, { marginLeft: 18 }]}>No partner matches yet.</Text>
          ) : (
            <FlatList
              data={partnerMatches}
              renderItem={renderMatch}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}

      {/* If neither intent, show nothing or a message */}
      {!hasDatingIntent && !hasPartnerIntent && (
        <Text style={[styles.subtitleMinimal, { marginLeft: 18, marginTop: 24 }]}>Enable Dating or Partner intent in your profile to see matches.</Text>
      )}

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
    backgroundColor: theme.colors.background,
  },
  centerContainerMinimal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingVertical: 8,
  },
  matchCardMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.text,
  },
  matchGymMinimal: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unreadBadgeMinimal: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadTextMinimal: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  messagePreviewMinimal: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  matchedTimeMinimal: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  titleMinimal: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
    color: theme.colors.text,
    letterSpacing: 1.1,
  },
  subtitleMinimal: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
