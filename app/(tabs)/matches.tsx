import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import PartnerDetailModal from '@/src/components/PartnerDetailModal';
import { SkeletonRow } from '@/src/components/SkeletonLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import { getPublicProfiles } from '@/src/services/accountService';
import { notificationService } from '@/src/services/notificationService';
import { messageService } from '@/src/services/messageService';
import { acceptPartnerRequest, declinePartnerRequest, getIncomingPartnerRequests, getMatches, unmatchUser } from '@/src/services/matchData';
import {
  getActiveDeclinedUserIds,
  getBlockedAgainstUser,
  getBlockedByUser,
  getIncomingLikes,
  getOutgoingDeclines,
  getOutgoingLikes,
} from '@/src/services/socialGraphService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import { Match } from '@/src/types/match';
import { getFirstImageUrl, getPocketBaseUrl, intentIncludes } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';


type FilterChip = 'all' | 'requests' | 'dating' | 'partner' | 'sessions';


export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Climber[]>([]);
  const [datingLikedHint, setDatingLikedHint] = useState<Climber | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Climber | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [hoveredRequestImageId, setHoveredRequestImageId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [acceptingRequestIds, setAcceptingRequestIds] = useState<string[]>([]);
  const [decliningRequestIds, setDecliningRequestIds] = useState<string[]>([]);
  const [blockReportMenuOpen, setBlockReportMenuOpen] = useState<string | null>(null);
  const [introModalVisible, setIntroModalVisible] = useState(false);
  const { user, token, darkMode } = useAuth();
  const prevPartnerRequestIdsRef = useRef<Set<string> | null>(null);
  const prevPartnerMatchIdsRef = useRef<Set<string> | null>(null);
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  // Check intents
  const hasDatingIntent = user && intentIncludes(user.intent, 'date');
  const hasPartnerIntent = user && intentIncludes(user.intent, 'partner');
  const hasBothIntents = hasDatingIntent && hasPartnerIntent;

  // Split matches by type
  const datingMatches = hasDatingIntent ? matches.filter(m => m.type === 'dating') : [];
  const partnerMatches = hasPartnerIntent ? matches.filter(m => m.type === 'partner') : [];
  const totalConnections = datingMatches.length + partnerMatches.length + incomingRequests.length;

  useEffect(() => {
    if (loading) return;
    if (matches.length === 0 && incomingRequests.length === 0) return;
    AsyncStorage.getItem('intro_seen_matches').then(val => {
      if (!val) setIntroModalVisible(true);
    });
  }, [loading, matches.length, incomingRequests.length]);

  const dismissIntro = () => {
    dismissIntro();
    AsyncStorage.setItem('intro_seen_matches', '1');
  };

  const isProfileComplete = user &&
    user.name &&
    typeof user.age === 'number' &&
    user.grade &&
    Array.isArray(user.climbing_styles) && user.climbing_styles.length > 0 &&
    user.home_gym &&
    user.bio &&
    (Array.isArray(user.images) && user.images.length > 0) &&
    user.email;

  // Extracted fetch function to reuse in multiple places
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!token || !user?.id) return;

      // Fetch matches
      const allMatches = await getMatches(token, user.id);
      const currentPartnerMatches = allMatches.filter((m) => m.type === 'partner');
      if (prevPartnerMatchIdsRef.current !== null) {
        currentPartnerMatches.forEach((m) => {
          if (!prevPartnerMatchIdsRef.current!.has(m.id)) {
            notificationService.notifyRequestAccepted(m.climber.name, m.climber.id, 'partner');
          }
        });
      }
      prevPartnerMatchIdsRef.current = new Set(currentPartnerMatches.map((m) => m.id));
      setMatches(allMatches);

      // Background: update each match card with the real last message preview
      messageService.setToken(token);
      Promise.all(
        allMatches.map(async (match) => {
          const lastMsg = await messageService.getLastMessage(user!.id, match.climber.id);
          return lastMsg ? { ...match, messagePreview: lastMsg.content } : match;
        })
      ).then((updated) => setMatches(updated)).catch(() => {});

      // Fetch incoming partner requests if partner intent enabled
      if (hasPartnerIntent) {
        const requests = await getIncomingPartnerRequests(user.id, token);
        if (prevPartnerRequestIdsRef.current !== null) {
          requests.forEach((r) => {
            if (!prevPartnerRequestIdsRef.current!.has(r.id)) {
              notificationService.notifyNewPartnerRequest(r.name, r.id);
            }
          });
        }
        prevPartnerRequestIdsRef.current = new Set(requests.map((r) => r.id));
        setIncomingRequests(requests);
      }

      // Fetch users who liked you in dating mode
      if (hasDatingIntent) {
        try {
          const [
            incomingLikes,
            outgoingLikes,
            outgoingDeclines,
            blockedByMe,
            blockedAgainstMe,
            profiles,
          ] = await Promise.all([
            getIncomingLikes(user.id, token, 'dating'),
            getOutgoingLikes(user.id, token, 'dating'),
            getOutgoingDeclines(user.id, token, 'dating'),
            getBlockedByUser(user.id, token),
            getBlockedAgainstUser(user.id, token),
            getPublicProfiles(token),
          ]);

          const blockedIds = new Set([
            ...blockedByMe.map((record) => record.to_user),
            ...blockedAgainstMe.map((record) => record.from_user),
          ]);

          const declinedDatingIds = new Set(
            getActiveDeclinedUserIds(outgoingDeclines, 'dating', 'outgoing')
          );
          const outgoingDatingIds = new Set(outgoingLikes.map((like) => like.to_user));
          const incomingDatingIds = incomingLikes.map((like) => like.from_user).filter(Boolean);
          const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

          const dateLikers = incomingDatingIds
            .filter((id) => !allMatches.some(m => m.climber.id === id && m.type === 'dating'))
            .filter((id) => !declinedDatingIds.has(id))
            .filter((id) => !blockedIds.has(id))
            .filter((id) => !outgoingDatingIds.has(id))
            .map((id) => profileMap.get(id))
            .filter(Boolean)
            .filter((profile) => intentIncludes((profile as Climber).intent, 'date')) as Climber[];

          // Set only one hint
          if (dateLikers.length > 0) {
            setDatingLikedHint(dateLikers[0]);
          } else {
            setDatingLikedHint(null);
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
  }, [token, user?.id, hasPartnerIntent, hasDatingIntent]);

  // Initial fetch on mount
  useEffect(() => {
    if (token && user?.id) {
      fetchData();
    }
  }, [token, user?.id, fetchData]);

  // Refetch matches when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (token && user?.id) {
        fetchData();
      }
    }, [token, user?.id, fetchData])
  );

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
  };

  const handleUnmatch = async (matchId: string) => {
    if (!user?.id || !token) return;

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      await unmatchUser(user.id, match.climber.id, match.type!, token);
      // Remove the match from local state
      setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
    } catch (error) {
      console.error('Failed to unmatch:', error);
      // You might want to show an alert here
    }
  };

  const handleMessage = (match: Match) => {
    setModalVisible(false);
    const POCKETBASE_URL = getPocketBaseUrl();
    let avatarUrl = '';
    if (match.climber.images && match.climber.images.length > 0) {
      avatarUrl = `${POCKETBASE_URL}/api/files/users/${match.climber.id}/${match.climber.images[0]}?thumb=40x40`;
    }
    router.push({
      pathname: '/chat',
      params: {
        matchId: match.id,
        climberName: match.climber.name,
        climberId: match.climber.id,
        climberAvatar: avatarUrl,
        climberData: JSON.stringify(match.climber)
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

  const handleDeclineRequest = async (request: Climber) => {
    try {
      setDecliningRequestIds(prev => [...prev, request.id]);
      // Record decline and hide the request
      await declinePartnerRequest(user!.id, request.id, token!);
      // Remove from the local requests list
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      if (process.env.EXPO_DEV_MODE) console.error('Failed to decline request:', err);
    } finally {
      setDecliningRequestIds(prev => prev.filter(id => id !== request.id));
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <Pressable style={styles.matchCardMinimal} onPress={() => {
      setSelectedMatch(item);
      setModalVisible(true);
    }}>
      <Image
        source={{ uri: getFirstImageUrl(item.climber.images, item.climber.id) }}
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

      <Pressable
        onPress={() => setBlockReportMenuOpen(item.climber.id)}
        style={styles.menuIconContainer}>
        <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
      </Pressable>

      <BlockReportMenu
        visible={blockReportMenuOpen === item.climber.id}
        userId={item.climber.id}
        userName={item.climber.name}
        onClose={() => setBlockReportMenuOpen(null)}
        onBlock={() => {
          setMatches(matches.filter(m => m.climber.id !== item.climber.id));
          setBlockReportMenuOpen(null);
        }}
        onUnmatch={() => {
          Alert.alert(
            'Unmatch',
            `Are you sure you want to unmatch with ${item.climber.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Unmatch', style: 'destructive', onPress: () => handleUnmatch(item.id) },
            ]
          );
        }}
        darkMode={darkMode}
      />
    </Pressable>
  );

  const renderRequest = ({ item }: { item: Climber }) => (
    <Pressable style={styles.requestCardMinimal}>
      <Pressable 
        style={styles.imageContainer}
        onPress={() => {
          setSelectedRequest(item);
          setRequestModalVisible(true);
          setHoveredRequestImageId(null);
        }}
        onPressIn={() => setHoveredRequestImageId(item.id)}
        onPressOut={() => setHoveredRequestImageId(null)}
      >
        <Image
          source={{ uri: getFirstImageUrl(item.images, item.id) || `${getPocketBaseUrl()}/api/files/users/${item.id}/${item.avatar}?thumb=100x100` }}
          style={styles.matchImageMinimal}
        />
        {hoveredRequestImageId === item.id && (
          <View style={styles.viewProfileOverlay}>
            <Ionicons name="eye" size={20} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.viewProfileText}>View Profile</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.matchInfoMinimal}>
        <Text style={styles.matchNameMinimal}>
          {item.name}, {item.age}
        </Text>
        <Text style={styles.matchGymMinimal}>{item.home_gym}</Text>
        <Text style={styles.requestBadge}>Wants to climb</Text>
      </View>

      <View style={styles.requestActions}>
        <View style={styles.requestButtonsContainer}>
          <Pressable
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item)}
            disabled={acceptingRequestIds.includes(item.id) || decliningRequestIds.includes(item.id)}
          >
            <Text style={styles.acceptButtonText}>
              {acceptingRequestIds.includes(item.id) ? 'Accepting...' : 'Accept'}
            </Text>
          </Pressable>
          
          <Pressable
            style={styles.declineButton}
            onPress={() => handleDeclineRequest(item)}
            disabled={acceptingRequestIds.includes(item.id) || decliningRequestIds.includes(item.id)}
          >
            <Text style={styles.declineButtonText}>
              {decliningRequestIds.includes(item.id) ? 'Declining...' : 'Decline'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setBlockReportMenuOpen(item.id)}
          style={styles.menuIconContainerSmall}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <BlockReportMenu
        visible={blockReportMenuOpen === item.id}
        userId={item.id}
        userName={item.name}
        onClose={() => setBlockReportMenuOpen(null)}
        onBlock={() => {
          setIncomingRequests(incomingRequests.filter(r => r.id !== item.id));
          setBlockReportMenuOpen(null);
        }}
        darkMode={darkMode}
      />
    </Pressable>
  );

  const renderDatingLikedHint = () => (
    <Pressable style={styles.datingLikedHintCard}>
      <Image
        source={{ uri: getFirstImageUrl(datingLikedHint!.images, datingLikedHint!.id) || `${getPocketBaseUrl()}/api/files/users/${datingLikedHint!.id}/${datingLikedHint!.avatar}?thumb=100x100` }}
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
        <SkeletonRow count={5} />
      </View>
    );
  }

  if (!isProfileComplete) {
    return (
      <View style={styles.centerContainer}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: theme.colors.accent + '12',
          borderWidth: 1, borderColor: theme.colors.accent + '30',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="alert-circle" size={36} color={theme.colors.accent} />
        </View>
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
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1, borderColor: theme.colors.border,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="alert-circle" size={32} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.titleMinimal}>No intents enabled</Text>
        <Text style={styles.subtitleMinimal}>
          Enable Dating or Climbing Partner in your profile to see matches.
        </Text>
      </View>
    );
  }

  // No matches at all (only check this for single-intent or when content is truly empty)
  if (filteredContent.length === 0 && !datingLikedHint && (showOnlyDating || showOnlyPartner)) {
    return (
      <View style={styles.centerContainerMinimal}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1, borderColor: theme.colors.border,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="heart-outline" size={32} color={theme.colors.textSecondary} />
        </View>
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
            const chipLabel =
              chip === 'all'
                ? 'All'
                : chip === 'requests'
                  ? 'Requests'
                  : chip === 'dating'
                    ? 'Dating'
                    : 'Climbing Partner';

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
                  {chipLabel} {count > 0 && `(${count})`}
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
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1, borderColor: theme.colors.border,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="heart-outline" size={32} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.titleMinimal}>No {activeFilter === 'requests' ? 'requests' : activeFilter === 'dating' ? 'dating matches' : activeFilter === 'partner' ? 'climbing partner matches' : 'matches'} yet</Text>
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
        onUnmatch={handleUnmatch}
        userLatitude={user?.latitude}
        userLongitude={user?.longitude}
      />

      <PartnerDetailModal
        visible={requestModalVisible}
        climber={selectedRequest}
        onClose={() => {
          setRequestModalVisible(false);
          setSelectedRequest(null);
        }}
        onSendRequest={() => {}} // No-op since this is view-only for incoming requests
        viewOnly={true}
        userLatitude={user?.latitude}
        userLongitude={user?.longitude}
      />

      <Modal
        visible={introModalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => dismissIntro()}
      >
        <Pressable style={styles.introOverlay} onPress={() => dismissIntro()}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={
                darkMode
                  ? ['rgba(255,46,99,0.18)', 'rgba(52,211,207,0.16)']
                  : ['rgba(255,46,99,0.12)', 'rgba(26,166,163,0.10)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <View style={styles.introHeader}>
                <Text style={styles.heroEyebrow}>Connections</Text>
                <Pressable onPress={() => dismissIntro()} style={styles.introCloseButton}>
                  <Ionicons name="close" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
              <Text style={styles.heroTitle}>Your people, all in one place</Text>
              <Text style={styles.introBodyText}>
                Filter between requests, dating, and climbing partner matches any time. This page stays focused on the list once you close this intro.
              </Text>
              <Pressable style={styles.introActionButton} onPress={() => dismissIntro()}>
                <Text style={styles.introActionText}>Open matches</Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topSection: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
    },
    heroCard: {
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      overflow: 'hidden',
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      backgroundColor: 'transparent',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 6,
    },
    heroSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.70)',
      borderWidth: 1,
      borderColor: 'rgba(23,32,45,0.06)',
    },
    heroPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
    },
    introOverlay: {
      flex: 1,
      backgroundColor: 'rgba(8,12,18,0.88)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    introCard: {
      width: '100%',
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 16,
    },
    introHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      backgroundColor: 'transparent',
    },
    introCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    introBodyText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    introActionButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    introActionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
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
      paddingHorizontal: 32,
    },
    // ─── Filter pill bar ──────────────────────────────────────────
    chipContainer: {
      backgroundColor: theme.colors.background,
      maxHeight: 58,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '60',
    },
    chipContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      gap: 7,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.30,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      letterSpacing: 0.2,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    listContent: {
      paddingTop: 6,
      paddingBottom: 28,
    },
    // ─── Match card ───────────────────────────────────────────────
    matchCardMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: 14,
      marginVertical: 5,
      borderRadius: 18,
      padding: 13,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    // ─── Partner request card ─────────────────────────────────────
    requestCardMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(52,211,207,0.07)',
      marginHorizontal: 14,
      marginVertical: 5,
      borderRadius: 18,
      padding: 13,
      borderWidth: 1,
      borderColor: 'rgba(52,211,207,0.20)',
      shadowColor: '#34D3CF',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    // ─── Dating liked hint ────────────────────────────────────────
    datingLikedHintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(212,175,55,0.10)',
      marginHorizontal: 14,
      marginVertical: 5,
      marginTop: 8,
      borderRadius: 18,
      padding: 13,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.25)',
    },
    // ─── Avatars ──────────────────────────────────────────────────
    matchImageMinimal: {
      width: 68,
      height: 68,
      borderRadius: 20,
      marginRight: 13,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    imageContainer: {
      position: 'relative',
      width: 68,
      height: 68,
      marginRight: 13,
    },
    viewProfileOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    viewProfileText: {
      color: '#fff',
      fontSize: 10,
      width: '50%',
      textAlign: 'center',
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    hintImage: {
      width: 68,
      height: 68,
      borderRadius: 20,
      marginRight: 13,
      opacity: 0.2,
    },
    // ─── Card text ────────────────────────────────────────────────
    matchInfoMinimal: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    matchHeaderMinimal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 2,
      backgroundColor: 'transparent',
    },
    matchNameMinimal: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 0.1,
    },
    matchGymMinimal: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
      letterSpacing: 0.1,
    },
    requestBadge: {
      fontSize: 11,
      color: '#34D3CF',
      fontWeight: '700',
      marginTop: 6,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    // ─── Request action buttons ───────────────────────────────────
    requestActions: {
      marginLeft: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      gap: 4,
    },
    requestButtonsContainer: {
      flexDirection: 'column',
      gap: 6,
      backgroundColor: 'transparent',
    },
    acceptButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      minWidth: 74,
      alignItems: 'center',
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.28,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    acceptButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.2,
    },
    declineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      minWidth: 74,
      alignItems: 'center',
    },
    declineButtonText: {
      color: theme.colors.textSecondary,
      fontWeight: '600',
      fontSize: 12,
    },
    // ─── Menu / overflow ──────────────────────────────────────────
    menuIconContainer: {
      width: 34,
      height: 34,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    menuIconContainerSmall: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 15,
    },
    // ─── Hint card text ───────────────────────────────────────────
    datingLikedHintLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#D4AF37',
      letterSpacing: 0.1,
    },
    datingLikedHintSubtext: {
      fontSize: 12,
      color: 'rgba(212,175,55,0.75)',
      marginTop: 3,
    },
    // ─── Unread badge (matches context) ──────────────────────────
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
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    // ─── Match card body text ─────────────────────────────────────
    messagePreviewMinimal: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 5,
      lineHeight: 18,
    },
    matchedTimeMinimal: {
      fontSize: 11,
      color: theme.colors.textSecondary + 'AA',
      letterSpacing: 0.1,
    },
    // ─── Empty / error states ─────────────────────────────────────
    titleMinimal: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 14,
      color: theme.colors.text,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    subtitleMinimal: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 6,
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 21,
    },
    emptyDecoration: {
      width: 80,
      height: 80,
      marginTop: 28,
      opacity: 0.45,
    },
  });
