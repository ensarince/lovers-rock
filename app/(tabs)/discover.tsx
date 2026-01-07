import { Text, View } from '@/components/Themed';
import { DiscoverFilters, FilterModal } from '@/src/components/FilterModal';
import { MatchAnimation } from '@/src/components/MatchAnimation';
import PartnerDetailModal from '@/src/components/PartnerDetailModal';
import { SwipeableCard } from '@/src/components/SwipeableCard';
import { useAuth } from '@/src/context/AuthContext';
import { preferenceService } from '@/src/services/preferenceService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  View as RNView,
  StyleSheet,
  Switch,
  TextInput
} from 'react-native';
import { getAllAccounts } from '../../src/services/accountService';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export default function DiscoverScreen() {
  // Dating mode state
  const [climbers, setClimbers] = useState<Climber[]>([]);
  const [filteredClimbers, setFilteredClimbers] = useState<Climber[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Partner mode state
  const [partners, setPartners] = useState<Climber[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Climber[]>([]);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DiscoverFilters>({});

  // Dating mode specific
  const [matchAnimationVisible, setMatchAnimationVisible] = useState(false);
  const [matchedClimber, setMatchedClimber] = useState<Climber | null>(null);

  // Partner mode specific
  const [selectedPartner, setSelectedPartner] = useState<Climber | null>(null);
  const [partnerModalVisible, setPartnerModalVisible] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState<string[]>([]);
  const [acceptedUserIds, setAcceptedUserIds] = useState<string[]>([]);

  // Dating mode interactions (swiped left or right)
  const [datingInteractionIds, setDatingInteractionIds] = useState<string[]>([]);

  // Toggle between dating and partner finding
  const [isDatingMode, setIsDatingMode] = useState(true);

  const { token, user, preferencesSynced, darkMode, setUser } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  // Helper to check if user profile is complete
  const isProfileComplete =
    user &&
    user.name &&
    typeof user.age === 'number' &&
    user.grade &&
    Array.isArray(user.climbing_styles) && user.climbing_styles.length > 0 &&
    user.home_gym &&
    user.bio &&
    user.avatar !== "" &&
    user.email;

  // Reset currentIndex when search or filters change (dating mode)
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchText, activeFilters, isDatingMode]);

  // Reset currentIndex if it's out of bounds when filteredClimbers changes
  useEffect(() => {
    if (currentIndex >= filteredClimbers.length && filteredClimbers.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredClimbers.length]);

  // Track users I have liked (for partner mode)
  useEffect(() => {
    if (!user || !token) return;
    const fetchAccepted = async () => {
      await preferenceService.syncPreferences(token, user.id);
      setAcceptedUserIds(preferenceService.getAccepted());
    };
    fetchAccepted();
  }, [user?.id, token, requestSentIds]);

  // Load dating mode data
  useEffect(() => {
    const loadDatingData = async () => {
      try {
        if (!token) return;

        // Fetch climbers
        const data = await getAllAccounts(token);

        // 1. Only users with 'date' intent
        // 2. Exclude self
        // 3. Only users with complete profiles
        const filtered = data.filter(
          (c) =>
            c.id !== user?.id &&
            Array.isArray(c.intent) && c.intent.includes('date') &&
            c.name !== '' &&
            typeof c.age === 'number' &&
            c.grade &&
            Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
            c.home_gym !== '' &&
            c.bio !== '' &&
            c.avatar !== '' &&
            c.email !== ''
        );

        // Normalize climbing_styles and avatar URL for each climber
        const normalized = filtered.map((c) => {
          const climbing_styles = typeof c.climbing_styles === 'string'
            ? JSON.parse(c.climbing_styles)
            : c.climbing_styles || [];

          let avatarUrl = '';
          if (c.avatar && c.id) {
            const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
            avatarUrl = `${baseUrl}/api/files/users/${c.id}/${c.avatar}?thumb=100x100`;
          }

          return {
            ...c,
            climbing_styles,
            image_url: avatarUrl,
          };
        });

        setClimbers(normalized);
        setFilteredClimbers(normalized);
        setError(null);
      } catch (err) {
        setError('Failed to load climbers');
        console.error(err);
      }
    };

    if (token && isDatingMode) {
      loadDatingData();
    }
  }, [token, user?.id, isDatingMode]);

  // Load partner mode data
  useEffect(() => {
    const loadPartnerData = async () => {
      try {
        if (!token || !user) return;

        // Fetch fresh user data to get latest liked_users
        const userRes = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (userRes.ok) {
          const freshUser = await userRes.json();
          setUser({ ...user, liked_users: freshUser.liked_users });
        }

        const data = await getAllAccounts(token);
        // Only show users with 'partner' intent, exclude self
        let filtered = data.filter(
          (c) => c.id !== user.id && Array.isArray(c.intent) && c.intent.includes('partner')
        );
        // Remove users who are already matched/connected (mutual like)
        filtered = filtered.filter((c) => {
          const theirLikes = Array.isArray(c.liked_users)
            ? c.liked_users
            : typeof c.liked_users === 'string'
              ? (() => { try { return JSON.parse(c.liked_users); } catch { return []; } })()
              : [];
          const iLikeThem = acceptedUserIds.includes(c.id);
          const theyLikeMe = theirLikes.includes(user.id);
          // If both liked each other, it's a match, so filter out
          return !(iLikeThem && theyLikeMe);
        });
        // OPTION B: Filter out users already interacted with in dating mode
        filtered = filtered.filter((c) => !datingInteractionIds.includes(c.id));
        // Only include users with complete profiles
        filtered = filtered.filter((c) =>
          c.name !== '' &&
          typeof c.age === 'number' &&
          c.grade &&
          Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
          c.home_gym !== '' &&
          c.bio !== '' &&
          c.email !== '' &&
          c.avatar !== ''
        );
        setPartners(filtered);
        setError(null);
      } catch (e) {
        setError('Failed to load partners');
      }
    };
    if (token && user && !isDatingMode) loadPartnerData();
  }, [token, user?.id, acceptedUserIds, isDatingMode, datingInteractionIds]);

  // Filter climbers when preferences are synced (dating mode)
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      let notLiked = climbers.filter(c => !preferenceService.isAccepted(c.id));
      // OPTION B: Filter out users already sent partner requests to
      notLiked = notLiked.filter(c => !requestSentIds.includes(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters);
      setFilteredClimbers(filtered);
    }
  }, [preferencesSynced, climbers, requestSentIds]);

  // Re-apply search and filters when they change (dating mode)
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      let notLiked = climbers.filter(c => !preferenceService.isAccepted(c.id));
      // OPTION B: Filter out users already sent partner requests to
      notLiked = notLiked.filter(c => !requestSentIds.includes(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters);
      setFilteredClimbers(filtered);
    }
  }, [searchText, activeFilters, preferencesSynced, climbers, requestSentIds]);

  // Filter partners when search/filters change (partner mode)
  useEffect(() => {
    let result = [...partners];
    // Search by name or gym
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.home_gym.toLowerCase().includes(searchLower)
      );
    }
    if (activeFilters.grade && activeFilters.grade.length > 0) {
      result = result.filter((c) => activeFilters.grade!.includes(c.grade));
    }
    if (activeFilters.styles && activeFilters.styles.length > 0) {
      result = result.filter((c) =>
        c.climbing_styles.some((s) => activeFilters.styles!.includes(s))
      );
    }
    if (activeFilters.minAge) {
      result = result.filter((c) => c.age >= activeFilters.minAge!);
    }
    if (activeFilters.maxAge) {
      result = result.filter((c) => c.age <= activeFilters.maxAge!);
    }
    setFilteredPartners(result);
  }, [partners, activeFilters, searchText]);

  const applyFiltersAndSearch = (
    baseClimbers: Climber[],
    search: string,
    filters: DiscoverFilters
  ) => {
    // Only include users with 'date' intent and complete profiles
    let result = baseClimbers.filter(
      (c) =>
        Array.isArray(c.intent) && c.intent.includes('date') &&
        c.name !== '' &&
        typeof c.age === 'number' &&
        c.grade &&
        Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
        c.home_gym !== '' &&
        c.bio !== '' &&
        c.avatar !== '' &&
        c.email !== ''
    );

    // Filter by search text
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.home_gym.toLowerCase().includes(searchLower)
      );
    }

    // Filter by grade
    if (filters.grade && filters.grade.length > 0) {
      result = result.filter((c) => filters.grade!.includes(c.grade));
    }

    // Filter by styles
    if (filters.styles && filters.styles.length > 0) {
      result = result.filter((c) =>
        c.climbing_styles.some((s) => filters.styles!.includes(s))
      );
    }

    // Filter by age
    if (filters.minAge) {
      result = result.filter((c) => c.age >= filters.minAge!);
    }
    if (filters.maxAge) {
      result = result.filter((c) => c.age <= filters.maxAge!);
    }

    return result;
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleApplyFilters = (filters: DiscoverFilters) => {
    setActiveFilters(filters);
    setFilterModalVisible(false);
  };

  // Partner modal handlers
  const openPartnerModal = (climber: Climber) => {
    setSelectedPartner(climber);
    setPartnerModalVisible(true);
  };

  const closePartnerModal = () => {
    setPartnerModalVisible(false);
    setSelectedPartner(null);
  };

  // Send partner request
  const handleSendPartnerRequest = async (climber: Climber, isRemoving?: boolean) => {
    if (!user || !token) {
      return;
    }

    try {
      // Fetch my own user record
      const res = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch current user');
      const me = await res.json();
      let likedUsers: string[] = [];
      if (Array.isArray(me.liked_users)) likedUsers = me.liked_users;
      else if (typeof me.liked_users === 'string') {
        try { likedUsers = JSON.parse(me.liked_users); } catch { likedUsers = []; }
      }

      // Add or remove climber from liked_users
      if (isRemoving) {
        likedUsers = likedUsers.filter(id => id !== climber.id);
      } else {
        if (!likedUsers.includes(climber.id)) likedUsers.push(climber.id);
      }

      // PATCH my liked_users
      const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ liked_users: likedUsers }),
      });

      // Update context
      const updatedUser = { ...user, liked_users: likedUsers };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (e) {
      if (process.env.EXPO_DEV_MODE) console.log('Error in handleSendPartnerRequest', e);
    }
  };


  const handleAccept = async (climber: Climber) => {
    if (!user?.id) {
      console.error('❌ No user ID available for liking!');
      return;
    }
    if (!token) {
      console.error('❌ No token available for liking!');
      return;
    }

    // Check if already liked
    if (preferenceService.isAccepted(climber.id)) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    // OPTION B: Track this user as interacted in dating mode
    setDatingInteractionIds(prev => [...prev, climber.id]);

    await preferenceService.accept(climber, token, user.id);

    // Check if this creates a mutual match
    try {
      const allUsers = await getAllAccounts(token);
      const likedUser = allUsers.find(u => u.id === climber.id);
      if (likedUser) {
        const likedUserLiked = likedUser.liked_users || [];
        if (likedUserLiked.includes(user.id)) {
          // It's a match! Show animation
          setMatchedClimber(climber);
          setMatchAnimationVisible(true);
        }
      }
    } catch (error) {
      console.error('Error checking for match:', error);
    }

    // Update filtered climbers to exclude the newly liked user
    setFilteredClimbers(prev => {
      const filtered = prev.filter(c => c.id !== climber.id);
      return filtered;
    });

    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex;
    });
  };

  const handleReject = (climber: Climber) => {
    // OPTION B: Track this user as interacted in dating mode
    setDatingInteractionIds(prev => [...prev, climber.id]);

    preferenceService.reject(climber);

    // Update filtered climbers to exclude the rejected user (they don't want to see them again)
    setFilteredClimbers(prev => prev.filter(c => c.id !== climber.id));

    setCurrentIndex((prev) => prev + 1);
    if (process.env.EXPO_DEV_MODE) console.log('Rejected:', climber.name);
  };

  const currentClimber = filteredClimbers.length > 0 ? filteredClimbers[currentIndex] : null;

  // Check if user has the required intent for the current mode
  const hasDatingIntent = user && (Array.isArray(user.intent) ? user.intent.includes('date') : user.intent === 'date');
  const hasPartnerIntent = user && (Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner');

  // If only one mode is enabled, force it
  useEffect(() => {
    if (!hasDatingIntent && hasPartnerIntent) {
      setIsDatingMode(false);
    } else if (hasDatingIntent && !hasPartnerIntent) {
      setIsDatingMode(true);
    }
  }, [hasDatingIntent, hasPartnerIntent]);

  // Start loading only if user has enabled at least one mode
  useEffect(() => {
    setLoading(!(isDatingMode ? climbers.length > 0 : partners.length > 0));
  }, [isDatingMode, climbers.length, partners.length]);

  // Show error if user doesn't have any intent enabled
  if (!hasDatingIntent && !hasPartnerIntent) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.border} />
        <Text style={{ fontSize: 18, color: theme.colors.text, marginTop: 16, textAlign: 'center' }}>
          Enable "Dating" or "Climbing Partner" in your profile to use this page.
        </Text>
      </View>
    );
  }

  // Show prompt if profile is incomplete
  if (!isProfileComplete) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ec4899" />
        <Text style={styles.emptyTitle}>Complete your profile</Text>
        <Text style={styles.emptySubtitle}>
          Please fill out your profile before discovering other climbers.
        </Text>
      </View>
    );
  }

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
        <Text style={{ color: theme.colors.error }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color="#6b7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or gym..."
          placeholderTextColor="#6b7280"
          value={searchText}
          onChangeText={handleSearchChange}
        />
        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={styles.filterButton}>
          <Ionicons name="funnel" size={20} color={theme.colors.accent} />
        </Pressable>
      </View>

      {/* Mode Toggle - Show only if user has both intents */}
      {hasDatingIntent && hasPartnerIntent && (
        <RNView style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>
            {isDatingMode ? '💕 Dating' : '🧗 Partner Finding'}
          </Text>
          <Switch
            value={isDatingMode}
            onValueChange={(value) => {
              setIsDatingMode(value);
              setCurrentIndex(0);
              setSearchText('');
              setActiveFilters({});
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor={isDatingMode ? theme.colors.accent : theme.colors.textSecondary}
          />
        </RNView>
      )}

      {/* Dating Mode - Swiping Cards */}
      {isDatingMode && hasDatingIntent ? (
        <View style={styles.cardContainer}>
          {currentClimber ? (
            <SwipeableCard
              climber={currentClimber}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={theme.colors.accent} />
              <Text style={styles.emptyTitle}>
                {filteredClimbers.length === 0
                  ? 'No climbers found'
                  : 'All caught up!'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filteredClimbers.length === 0
                  ? 'Try adjusting your filters'
                  : 'Check back soon for more climbers'}
              </Text>
            </View>
          )}
        </View>
      ) : !isDatingMode && hasPartnerIntent ? (
        /* Partner Mode - List View */
        <RNView style={styles.partnerListContainer}>
          <FlatList
            data={filteredPartners}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => openPartnerModal(item)} style={styles.partnerCard}>
                <View style={styles.partnerCardContent}>
                  {item.avatar && item.id ? (
                    <Image
                      source={{ uri: `http://${process.env.EXPO_PUBLIC_IP}:8090/api/files/users/${item.id}/${item.avatar}?thumb=100x100` }}
                      style={styles.partnerAvatar}
                    />
                  ) : (
                    <View style={styles.partnerAvatarPlaceholder}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                  )}
                  <View style={styles.partnerInfo}>
                    <Text style={styles.partnerName}>{item.name}</Text>
                    <Text style={styles.partnerDetail}>Gym: {item.home_gym}</Text>
                    <Text style={styles.partnerDetail}>Grade: {item.grade}</Text>
                    <Text style={styles.partnerDetail}>
                      Styles: {Array.isArray(item.climbing_styles) ? item.climbing_styles.join(', ') : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No partners found.</Text>}
          />
        </RNView>
      ) : null}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={activeFilters}
      />

      {/* Match Animation (Dating Mode) */}
      {matchAnimationVisible && (
        <MatchAnimation
          visible={matchAnimationVisible}
          climber={matchedClimber!}
          onClose={() => {
            setMatchAnimationVisible(false);
            setMatchedClimber(null);
          }}
        />
      )}

      {/* Partner Detail Modal (Partner Mode) */}
      <PartnerDetailModal
        visible={partnerModalVisible}
        climber={partnerModalVisible ? selectedPartner : null}
        onClose={closePartnerModal}
        onSendRequest={handleSendPartnerRequest}
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
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: 14,
    },
    filterButton: {
      padding: 8,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 20,
      marginVertical: 8,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    cardContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      width: '100%',
      backgroundColor: 'transparent',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: 'transparent',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    counterContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    counter: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    partnerListContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 0,
    },
    partnerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      marginHorizontal: 12,
      marginVertical: 0,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    partnerCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    partnerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
      backgroundColor: '#eee',
    },
    partnerAvatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
      backgroundColor: '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    partnerInfo: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    partnerName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    partnerDetail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      color: theme.colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 20,
    },
  });

