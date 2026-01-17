import { Text, View } from '@/components/Themed';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { getAllAccounts } from '@/src/services/accountService';
import { acceptPartnerRequest, getIncomingPartnerRequests, getMatches } from '@/src/services/matchData';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import { Match } from '@/src/types/match';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet
} from 'react-native';

type FilterChip = 'all' | 'requests' | 'dating' | 'partner' | 'sessions';

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Climber[]>([]);
  const [datingLikedHint, setDatingLikedHint] = useState<Climber | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [acceptingRequestIds, setAcceptingRequestIds] = useState<string[]>([]);
  const { user, token, darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  // Check intents
  const hasDatingIntent = user && (Array.isArray(user.intent) ? user.intent.includes('date') : user.intent === 'date');
  const hasPartnerIntent = user && (Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner');
  const hasBothIntents = hasDatingIntent && hasPartnerIntent;

  // Split matches by type
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
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!token || !user?.id) return;

        // Fetch matches
        const allMatches = await getMatches(token, user.id);
        setMatches(allMatches);

        // Fetch incoming partner requests if partner intent enabled
        if (hasPartnerIntent) {
          const requests = await getIncomingPartnerRequests(user.id, token);
          setIncomingRequests(requests);
        }

        // Fetch users who liked you in dating mode
        if (hasDatingIntent) {
          try {
            const allUsers = await getAllAccounts(token);
            // Find users with 'date' intent who have liked you in dating mode and you haven't liked back yet
            const dateLikers = allUsers.filter((u: Climber) => {
              const theirLikesDating = Array.isArray(u.liked_users_dating)
                ? u.liked_users_dating
                : typeof u.liked_users_dating === 'string'
                  ? (() => { try { return JSON.parse(u.liked_users_dating); } catch { return []; } })()
                  : [];
              return (
                Array.isArray(u.intent) && u.intent.includes('date') &&
                theirLikesDating.includes(user.id) &&
                !allMatches.some(m => m.climber.id === u.id && m.type === 'dating')
              );
            });
            // Set only one hint
            if (dateLikers.length > 0) {
              setDatingLikedHint(dateLikers[0]);
            }
          } catch (e) {
            if (process.env.EXPO_DEV_MODE) console.error('Error fetching dating likers:', e);
          }
        }
      } catch (err) {
        if (process.env.EXPO_DEV_MODE) console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) {
      fetchData();
    }
  }, [token, user?.id, hasPartnerIntent, hasDatingIntent]);

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
  };

  const handleMessage = (match: Match) => {
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

  const handleAcceptRequest = async (request: Climber) => {
    try {
      setAcceptingRequestIds(prev => [...prev, request.id]);
      await acceptPartnerRequest(user!.id, request.id, token!);
      // Remove from requests list
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
      // Refetch matches to include the new match
      const updatedMatches = await getMatches(token!, user!.id);
      setMatches(updatedMatches);
    } catch (err) {
      if (process.env.EXPO_DEV_MODE) console.error('Failed to accept request:', err);
    } finally {
      setAcceptingRequestIds(prev => prev.filter(id => id !== request.id));
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <Pressable style={styles.matchCardMinimal} onPress={() => {
      setSelectedMatch(item);
      setModalVisible(true);
    }}>
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
          Matched {Math.floor((Date.now() - item.matchedAt) / (1000 * 60 * 60))}h ago
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );

  const renderRequest = ({ item }: { item: Climber }) => (
    <Pressable style={styles.requestCardMinimal}>
      <Image
        source={{ uri: item.image_url || `http://${process.env.EXPO_PUBLIC_IP}:8090/api/files/users/${item.id}/${item.avatar}?thumb=100x100` }}
        style={styles.matchImageMinimal}
      />

      <View style={styles.matchInfoMinimal}>
        <Text style={styles.matchNameMinimal}>
          {item.name}, {item.age}
        </Text>
        <Text style={styles.matchGymMinimal}>{item.home_gym}</Text>
        <Text style={styles.requestBadge}>Wants to climb</Text>
      </View>

      <View style={styles.requestActions}>
        <Pressable
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item)}
          disabled={acceptingRequestIds.includes(item.id)}
        >
          <Text style={styles.acceptButtonText}>
            {acceptingRequestIds.includes(item.id) ? 'Accepting...' : 'Accept'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderDatingLikedHint = () => (
    <Pressable style={styles.datingLikedHintCard}>
      <Image
        source={{ uri: datingLikedHint!.image_url || `http://${process.env.EXPO_PUBLIC_IP}:8090/api/files/users/${datingLikedHint!.id}/${datingLikedHint!.avatar}?thumb=100x100` }}
        style={[styles.hintImage, { opacity: 0.2 }]}
      />

      <View style={styles.matchInfoMinimal}>
        <Text style={styles.datingLikedHintLabel}>Someone liked you</Text>
        <Text style={styles.datingLikedHintSubtext}>Swipe discover to find them</Text>
      </View>

      <Ionicons name="sparkles" size={24} color="#D4AF37" />
    </Pressable>
  );

  // Determine what to show based on intents
  const showOnlyDating = hasDatingIntent && !hasPartnerIntent;
  const showOnlyPartner = !hasDatingIntent && hasPartnerIntent;

  // Get filtered content
  const getFilteredContent = () => {
    if (showOnlyDating) {
      return datingMatches;
    } else if (showOnlyPartner) {
      return partnerMatches;
    } else if (hasBothIntents) {
      switch (activeFilter) {
        case 'requests':
          return incomingRequests;
        case 'dating':
          return datingMatches;
        case 'partner':
          return partnerMatches;
        case 'all':
        default:
          return [...incomingRequests, ...datingMatches, ...partnerMatches];
      }
    }
    return [];
  };

  const filteredContent = getFilteredContent();

  if (loading) {
    return (
      <View style={styles.centerContainerMinimal}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
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
      </View>
    );
  }

  // No intents enabled
  if (!hasDatingIntent && !hasPartnerIntent) {
    return (
      <View style={styles.centerContainerMinimal}>
        <Ionicons name="alert-circle" size={44} color={theme.colors.border} style={{ padding: 8 }} />
        <Text style={styles.titleMinimal}>No intents enabled</Text>
        <Text style={styles.subtitleMinimal}>
          Enable Dating or Partner in your profile to see matches.
        </Text>
      </View>
    );
  }

  // No matches at all (only check this for single-intent or when content is truly empty)
  if (filteredContent.length === 0 && !datingLikedHint && (showOnlyDating || showOnlyPartner)) {
    return (
      <View style={styles.centerContainerMinimal}>
        <Ionicons name="heart-outline" size={44} color={theme.colors.textSecondary} style={{ padding: 8 }} />
        <Text style={styles.titleMinimal}>No matches yet</Text>
        <Text style={styles.subtitleMinimal}>
          Go discover climbers you like!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Chips - Only show if both intents enabled */}
      {hasBothIntents && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
          contentContainerStyle={styles.chipContent}
        >
          {(['all', 'requests', 'dating', 'partner'] as const).map((chip) => {
            let count = 0;
            if (chip === 'all') count = datingMatches.length + partnerMatches.length + incomingRequests.length;
            else if (chip === 'requests') count = incomingRequests.length;
            else if (chip === 'dating') count = datingMatches.length;
            else if (chip === 'partner') count = partnerMatches.length;

            return (
              <Pressable
                key={chip}
                style={[
                  styles.chip,
                  activeFilter === chip && styles.chipActive
                ]}
                onPress={() => setActiveFilter(chip)}
              >
                <Text style={[
                  styles.chipText,
                  activeFilter === chip && styles.chipTextActive
                ]}>
                  {chip.charAt(0).toUpperCase() + chip.slice(1)} {count > 0 && `(${count})`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Dating Liked Hint - Show if dating intent enabled and someone liked them */}
      {hasDatingIntent && datingLikedHint && (activeFilter === 'all' || activeFilter === 'dating' || showOnlyDating) && (
        renderDatingLikedHint()
      )}

      {/* Content */}
      {filteredContent.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="heart-outline" size={44} color={theme.colors.textSecondary} style={{ padding: 8 }} />
          <Text style={styles.titleMinimal}>No {activeFilter === 'requests' ? 'requests' : activeFilter === 'dating' ? 'dating matches' : activeFilter === 'partner' ? 'partner matches' : 'matches'} yet</Text>
          <Text style={styles.subtitleMinimal}>
            Go discover climbers you like!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContent}
          renderItem={(item) => {
            if (activeFilter === 'requests' || (hasBothIntents && activeFilter === 'all' && filteredContent[filteredContent.indexOf(item.item)]?.id === item.item.id && !('type' in item.item))) {
              return renderRequest(item as any);
            }
            return renderMatch(item as any);
          }}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
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

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  chipContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 60,
  },
  chipContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chipTextActive: {
    color: '#fff',
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
  requestCardMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '15',
    marginHorizontal: 18,
    marginVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  datingLikedHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF3720',
    marginHorizontal: 18,
    marginVertical: 10,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#D4AF3740',
  },
  matchImageMinimal: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
  },
  hintImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
    filter: 'blur(5px)',
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
  requestBadge: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  requestActions: {
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  datingLikedHintLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D4AF37',
  },
  datingLikedHintSubtext: {
    fontSize: 12,
    color: '#D4AF37CC',
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
