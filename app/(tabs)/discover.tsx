import { DiscoverFilters, FilterModal } from '@/src/components/FilterModal';
import { MatchAnimation } from '@/src/components/MatchAnimation';
import PartnerDetailModal from '@/src/components/PartnerDetailModal';
import { SkeletonCard } from '@/src/components/SkeletonLoader';
import { SwipeableCard } from '@/src/components/SwipeableCard';
import { useAuth } from '@/src/context/AuthContext';
import { calculateDistance } from '@/src/services/geoService';
import { locationService } from '@/src/services/locationService';
import { declineDatingUser } from '@/src/services/matchData';
import { notificationService } from '@/src/services/notificationService';
import { preferenceService } from '@/src/services/preferenceService';
import { getReportService } from '@/src/services/reportService';
import {
  createLike,
  getActiveDeclinedUserIds,
  getIncomingLikes,
  getOutgoingDeclines,
  getOutgoingLikes,
  hasIncomingLike,
  removeLike,
} from '@/src/services/socialGraphService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl, intentIncludes } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { getPublicProfiles } from '../../src/services/accountService';


let hasShownDiscoverIntro = false;

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
  const [bioDetailClimber, setBioDetailClimber] = useState<Climber | null>(null);

  // Partner mode specific
  const [selectedPartner, setSelectedPartner] = useState<Climber | null>(null);
  const [partnerModalVisible, setPartnerModalVisible] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState<string[]>([]);

  // Dating mode interactions (swiped left or right)
  const [datingInteractionIds, setDatingInteractionIds] = useState<string[]>([]);

  const [isDatingMode, setIsDatingMode] = useState(true);

  // Track blocked users at component level
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Trigger for manual refresh of blocked users
  const [blockRefreshTrigger, setBlockRefreshTrigger] = useState(0);
  const [introModalVisible, setIntroModalVisible] = useState(!hasShownDiscoverIntro);
  const [datingCardAreaHeight, setDatingCardAreaHeight] = useState(0);

  const { token, user, preferencesSynced, darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const modeColors = isDatingMode
    ? {
        accent: theme.colors.accent,
        accentSoft: darkMode ? 'rgba(255,46,99,0.18)' : 'rgba(255,46,99,0.08)',
        accentSurface: darkMode ? 'rgba(255,46,99,0.12)' : 'rgba(255,46,99,0.06)',
      }
    : {
        accent: theme.colors.edit,
        accentSoft: darkMode ? 'rgba(52,211,207,0.18)' : 'rgba(26,166,163,0.10)',
        accentSurface: darkMode ? 'rgba(52,211,207,0.12)' : 'rgba(26,166,163,0.08)',
      };

  // Helper to check if user profile is complete
  const isProfileComplete =
    user &&
    user.name &&
    typeof user.age === 'number' &&
    user.grade &&
    Array.isArray(user.climbing_styles) && user.climbing_styles.length > 0 &&
    user.home_gym &&
    user.bio &&
    (Array.isArray(user.images) && user.images.length > 0) &&
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

  // Fetch and maintain blocked users at component level
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user?.id || !token) return;
      try {
        const reportService = getReportService();
        const blocked = await reportService.getBlockedUsers(user.id, token);
        setBlockedUserIds(blocked);
      } catch (err) {
        console.error('❌ Failed to fetch blocked users:', err);
        // Fallback to user's blocked_users if API fails
        if (Array.isArray(user?.blocked_users)) {
          const blocked = user.blocked_users.map((item: any) => {
            if (typeof item === 'object' && item !== null && item.id) {
              return item.id;
            }
            return String(item);
          });
          console.log('Using fallback blocked users:', blocked);
          setBlockedUserIds(blocked);
        }
      }
    };
    fetchBlockedUsers();
  }, [user?.id, token, blockRefreshTrigger]);

  // Start location tracking after 3 seconds to prevent login freeze
  useEffect(() => {
    if (!user?.id || !token) return;
    
    const locationTimer = setTimeout(() => {
      locationService.startPeriodicLocationUpdates(user.id, token, 5);
    }, 3000);

    return () => clearTimeout(locationTimer);
  }, [user?.id, token]);

  // Track users I have liked (for partner mode)
  useEffect(() => {
    if (!user || !token) return;
    const syncPreferences = async () => {
      await preferenceService.syncPreferences(token, user.id);
      setRequestSentIds(preferenceService.getAcceptedForPartner());
    };
    syncPreferences();
  }, [user?.id, token]);

  // Load dating mode data - runs on load and when blocked list changes
  useEffect(() => {
    const loadDatingData = async () => {
      setLoading(true);
      try {
        if (!token || !user?.id) return;

        const [
          declinedDatingRecords,
          outgoingPartnerLikes,
          incomingPartnerLikes,
        ] = await Promise.all([
          getOutgoingDeclines(user.id, token, 'dating'),
          getOutgoingLikes(user.id, token, 'partner'),
          getIncomingLikes(user.id, token, 'partner'),
        ]);

        const declinedDatingIds = new Set(
          getActiveDeclinedUserIds(declinedDatingRecords, 'dating', 'outgoing')
        );
        // Partner matches — mutual partner likes → exclude from dating feed
        const likedPartnerIds = new Set(outgoingPartnerLikes.map((l) => l.to_user).filter(Boolean));
        const incomingPartnerIds = new Set(incomingPartnerLikes.map((l) => l.from_user).filter(Boolean));
        const isPartnerMatch = (id: string) => likedPartnerIds.has(id) && incomingPartnerIds.has(id);

        // Fetch climbers
        const data = await getPublicProfiles(token);

        const isActivelyDeclined = (userId: string): boolean => declinedDatingIds.has(userId);

        // 1. Only users with 'date' intent
        // 2. Exclude self
        // 3. Exclude blocked users (by me or who blocked me)
        // 4. Exclude declined users (if decline is still active)
        // 5. Only users with complete profiles
        // 6. Only verified users
        const filtered = data.filter(
          (c) =>
            c.id !== user?.id &&
            !blockedUserIds.includes(c.id) &&
            !isActivelyDeclined(c.id) &&
            !isPartnerMatch(c.id) &&
            c.verified === true &&
            intentIncludes(c.intent, 'date') &&
            c.name !== '' &&
            typeof c.age === 'number' &&
            c.grade &&
            Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
            c.home_gym !== '' &&
            c.bio !== '' &&
            (Array.isArray(c.images) && c.images.length > 0) &&
            c.profile_completed === true
        );
        
        if (process.env.EXPO_DEV_MODE) {
          const blockedButShown = data.filter(c => blockedUserIds.includes(c.id) && intentIncludes(c.intent, 'date'));
          if (blockedButShown.length > 0) {
            console.warn('❌ BLOCKED USERS STILL IN DATING DATA:', blockedButShown.map(c => `${c.name} (${c.id})`));
            console.warn('Blocked IDs:', blockedUserIds);
            console.warn('Filtered count:', filtered.length, 'Total count:', data.length);
          } else {
            console.log('✅ No blocked users in dating feed. Total users after filter:', filtered.length);
          }
          console.log('📋 Active declined users in dating:', declinedDatingIds.size);
        }

        // Normalize climbing_styles and avatar URL for each climber
        const normalized = filtered.map((c) => {
          const climbing_styles = typeof c.climbing_styles === 'string'
            ? JSON.parse(c.climbing_styles)
            : c.climbing_styles || [];

          let avatarUrl = '';
          if (c.id) {
            const baseUrl = getPocketBaseUrl();
            // Prioritize images array, fall back to avatar field
            if (Array.isArray(c.images) && c.images.length > 0) {
              avatarUrl = `${baseUrl}/api/files/users/${c.id}/${c.images[0]}?thumb=100x100`;
            } else if (c.avatar) {
              avatarUrl = `${baseUrl}/api/files/users/${c.id}/${c.avatar}?thumb=100x100`;
            }
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
        console.error('Dating loading error:', err);
        setError('Failed to load climbers');
        setClimbers([]);
        setFilteredClimbers([]);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) {
      loadDatingData();
    }
  }, [token, user?.id, blockedUserIds]);

  // Load partner mode data - runs on load and when blocked list changes
  useEffect(() => {
    const loadPartnerData = async () => {
      setLoading(true);
      try {
        if (!token || !user) return;
        
        const [
          outgoingPartnerLikes,
          outgoingDatingLikes,
          incomingPartnerLikes,
          incomingDatingLikes,
          outgoingPartnerDeclines,
        ] = await Promise.all([
          getOutgoingLikes(user.id, token, 'partner'),
          getOutgoingLikes(user.id, token, 'dating'),
          getIncomingLikes(user.id, token, 'partner'),
          getIncomingLikes(user.id, token, 'dating'),
          getOutgoingDeclines(user.id, token, 'partner'),
        ]);

        const likedUsersPartner = outgoingPartnerLikes.map((like) => like.to_user).filter(Boolean);
        const likedUsersDating = outgoingDatingLikes.map((like) => like.to_user).filter(Boolean);
        const incomingPartnerLikeIds = new Set(incomingPartnerLikes.map((like) => like.from_user).filter(Boolean));
        const incomingDatingLikeIds = new Set(incomingDatingLikes.map((like) => like.from_user).filter(Boolean));
        const declinedUsers = getActiveDeclinedUserIds(outgoingPartnerDeclines, 'partner', 'outgoing');
        // Dating matches = mutual dating likes → exclude from partner feed
        const isDatingMatch = (id: string) => likedUsersDating.includes(id) && incomingDatingLikeIds.has(id);

        const data = await getPublicProfiles(token);
        // Only show users with 'partner' intent, exclude self and blocked users, only verified users
        let filtered = data.filter(
          (c) => c.id !== user.id && 
                 !blockedUserIds.includes(c.id) &&
                 c.verified === true &&
                 intentIncludes(c.intent, 'partner')
        );
        if (process.env.EXPO_DEV_MODE) {
          const blockedButShown = data.filter(c => blockedUserIds.includes(c.id) && intentIncludes(c.intent, 'partner'));
          if (blockedButShown.length > 0) {
            console.warn('❌ BLOCKED USERS STILL IN PARTNER DATA:', blockedButShown.map(c => `${c.name} (${c.id})`));
            console.warn('Blocked IDs:', blockedUserIds);
            console.warn('Filtered count:', filtered.length, 'Total count:', data.length);
          } else {
            console.log('✅ No blocked users in partner feed. Total users after filter:', filtered.length);
          }
        }
        // Remove users who are already dating matches (mutual dating like)
        filtered = filtered.filter((c) => !isDatingMatch(c.id));
        // Remove users who are already matched/connected (mutual like in partner mode)
        filtered = filtered.filter((c) => {
          const iLikeThem = likedUsersPartner.includes(c.id);
          const theyLikeMe = incomingPartnerLikeIds.has(c.id);
          // If both liked each other in partner mode, it's a match, so filter out
          return !(iLikeThem && theyLikeMe);
        });
        // Filter out users already liked in dating mode (from database)
        filtered = filtered.filter((c) => !likedUsersDating.includes(c.id));
        // Also filter out users interacted with in this session (for additional safety)
        filtered = filtered.filter((c) => !datingInteractionIds.includes(c.id));
        // Filter out users we've declined (from database) - they shouldn't reappear
        filtered = filtered.filter((c) => !declinedUsers.includes(c.id));
        // Filter out users already matched with in partner mode (both liked each other)
        filtered = filtered.filter((c) => !likedUsersPartner.includes(c.id) || !incomingPartnerLikeIds.has(c.id));
        // Only include users with complete profiles
        filtered = filtered.filter((c) =>
          c.name !== '' &&
          typeof c.age === 'number' &&
          c.grade &&
          Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
          c.home_gym !== '' &&
          c.bio !== '' &&
          c.profile_completed === true &&
          (Array.isArray(c.images) && c.images.length > 0)
        );
        setPartners(filtered);
        setError(null);
      } catch (e) {
        console.error('Partner loading error:', e);
        setError('Failed to load partners');
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };
    if (token && user) loadPartnerData();
  }, [token, user?.id, blockedUserIds]);

  // Filter climbers when preferences are synced (dating mode)
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      let notLiked = climbers.filter(c => !preferenceService.isAcceptedForDating(c.id));
      // Filter out users already sent partner requests to
      notLiked = notLiked.filter(c => !requestSentIds.includes(c.id));
      // Filter out users already interacted with in this session (swiped left or right)
      notLiked = notLiked.filter(c => !datingInteractionIds.includes(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters, blockedUserIds);
      setFilteredClimbers(filtered);
    }
  }, [preferencesSynced, climbers, requestSentIds, blockedUserIds, datingInteractionIds]);

  // Re-apply search and filters when they change (dating mode)
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      let notLiked = climbers.filter(c => !preferenceService.isAcceptedForDating(c.id));
      // Filter out users already sent partner requests to
      notLiked = notLiked.filter(c => !requestSentIds.includes(c.id));
      // Filter out users already interacted with in this session (swiped left or right)
      notLiked = notLiked.filter(c => !datingInteractionIds.includes(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters, blockedUserIds);
      setFilteredClimbers(filtered);
    }
  }, [searchText, activeFilters, preferencesSynced, climbers, requestSentIds, blockedUserIds, datingInteractionIds]);

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
      result = result.filter((c) => activeFilters.grade!.includes(c.grade.general_level));
    }
    if (activeFilters.styles && activeFilters.styles.length > 0) {
      result = result.filter((c) =>
        c.climbing_styles.some((s) => activeFilters.styles!.includes(s))
      );
    }
    if (activeFilters.genders && activeFilters.genders.length > 0) {
      result = result.filter((c) => {
        if (!c.gender) {
          return false;
        }
        return activeFilters.genders!.includes(c.gender);
      });
    }
    if (activeFilters.minAge) {
      result = result.filter((c) => c.age >= activeFilters.minAge!);
    }
    if (activeFilters.maxAge) {
      result = result.filter((c) => c.age <= activeFilters.maxAge!);
    }
    // Filter by distance for partner mode
    if (activeFilters.maxDistance !== undefined && user?.latitude && user?.longitude) {
      const userLat = user.latitude;
      const userLon = user.longitude;
      result = result.filter((c) => {
        if (!c.latitude || !c.longitude) return false;
        const distance = calculateDistance(
          userLat,
          userLon,
          c.latitude,
          c.longitude
        );
        return distance <= (activeFilters.maxDistance || 50);
      });
    }
    // Filter by gym name (case-insensitive) for partner mode
    if (activeFilters.gym && activeFilters.gym.trim().length > 0) {
      const gymLower = activeFilters.gym.toLowerCase();
      result = result.filter((c) =>
        c.home_gym.toLowerCase().includes(gymLower)
      );
    }
    setFilteredPartners(result);
  }, [partners, activeFilters, searchText, user?.latitude, user?.longitude]);

  const applyFiltersAndSearch = (
    baseClimbers: Climber[],
    search: string,
    filters: DiscoverFilters,
    blocked: string[] = []
  ) => {
    // Only include users with 'date' intent and complete profiles
    let result = baseClimbers.filter(
      (c) =>
        !blocked.includes(c.id) &&
        intentIncludes(c.intent, 'date') &&
        c.name !== '' &&
        typeof c.age === 'number' &&
        c.grade &&
        Array.isArray(c.climbing_styles) && c.climbing_styles.length > 0 &&
        c.home_gym !== '' &&
        c.bio !== '' &&
        (Array.isArray(c.images) && c.images.length > 0) &&
        c.profile_completed === true
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

    // Filter by grade (now checking general_level against filter values)
    if (filters.grade && filters.grade.length > 0) {
      result = result.filter((c) => filters.grade!.includes(c.grade.general_level));
    }

    // Filter by styles
    if (filters.styles && filters.styles.length > 0) {
      result = result.filter((c) =>
        c.climbing_styles.some((s) => filters.styles!.includes(s))
      );
    }

    // Filter by gender
    if (filters.genders && filters.genders.length > 0) {
      result = result.filter((c) => {
        if (!c.gender) {
          return false; // Exclude if no gender
        }
        return filters.genders!.includes(c.gender);
      });
    }

    // Filter by age
    if (filters.minAge) {
      result = result.filter((c) => c.age >= filters.minAge!);
    }
    if (filters.maxAge) {
      result = result.filter((c) => c.age <= filters.maxAge!);
    }

    // Filter by distance
    if (filters.maxDistance !== undefined && user?.latitude && user?.longitude) {
      const userLat = user.latitude;
      const userLon = user.longitude;
      result = result.filter((c) => {
        if (!c.latitude || !c.longitude) return false; // Exclude users without location
        const distance = calculateDistance(
          userLat,
          userLon,
          c.latitude,
          c.longitude
        );
        return distance <= (filters.maxDistance || 50);
      });
    }

    // Filter by gym name (case-insensitive)
    if (filters.gym && filters.gym.trim().length > 0) {
      const gymLower = filters.gym.toLowerCase();
      result = result.filter((c) =>
        c.home_gym.toLowerCase().includes(gymLower)
      );
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

  // Show full bio when card is tapped
  const showFullBio = (climber: Climber) => {
    // Only show modal if bio is actually long (more than ~150 chars or would wrap to 4+ lines)
    if (climber.bio && climber.bio.length > 150) {
      setBioDetailClimber(climber);
    }
  };

  const closeBioDetail = () => {
    setBioDetailClimber(null);
  };

  // Send partner request
  const handleSendPartnerRequest = async (climber: Climber, isRemoving?: boolean) => {
    if (!user || !token) {
      return;
    }

    try {
      if (isRemoving) {
        await removeLike(user.id, climber.id, 'partner', token);
      } else {
        await createLike(user.id, climber.id, 'partner', token);
      }

      setRequestSentIds((prev) => {
        if (isRemoving) {
          return prev.filter((id) => id !== climber.id);
        }
        return Array.from(new Set([...prev, climber.id]));
      });
    } catch (e) {
      if (process.env.EXPO_DEV_MODE) console.log('Error in handleSendPartnerRequest', e);
    }
  };


  const handleAccept = async (climber: Climber) => {
    if (!user?.id) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ No user ID available for liking!');
      return;
    }
    if (!token) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ No token available for liking!');
      return;
    }

    const removeFromDatingFeed = (climberId: string) => {
      setFilteredClimbers((prev) => {
        const next = prev.filter(c => c.id !== climberId);
        setCurrentIndex((current) => {
          if (next.length === 0) return 0;
          return Math.min(current, next.length - 1);
        });
        return next;
      });
    };

    // Check if already liked for dating mode
    if (isDatingMode && preferenceService.isAcceptedForDating(climber.id)) {
      removeFromDatingFeed(climber.id);
      return;
    }

    // Track this user as interacted in dating mode
    setDatingInteractionIds(prev => [...prev, climber.id]);

    // IMPORTANT: Pass 'dating' intent when accepting in dating mode
    await preferenceService.accept(climber, token, user.id, 'dating');

    // Cross-mode dedup: remove from partner feed immediately (mirrors DB-side filter)
    setPartners(prev => prev.filter(p => p.id !== climber.id));

    // Check if this creates a mutual match
    try {
      const isMutual = await hasIncomingLike(user.id, climber.id, 'dating', token);
      if (isMutual) {
        // It's a dating match! Show animation
        setMatchedClimber(climber);
        setMatchAnimationVisible(true);
        notificationService.notifyNewDatingMatch(climber.name, climber.id);
      }
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('Error checking for match:', error);
    }

    // Update filtered climbers to exclude the newly liked user
    removeFromDatingFeed(climber.id);
  };

  const handleReject = async (climber: Climber) => {
    // Track this user as interacted in dating mode
    setDatingInteractionIds(prev => [...prev, climber.id]);

    preferenceService.reject(climber);

    // In dating mode, add to declined list with timestamp
    if (isDatingMode && user?.id && token) {
      try {
        await declineDatingUser(user.id, climber.id, token);
        console.log('✅ Added to declined dating users:', climber.name);
      } catch (error) {
        console.error('❌ Failed to decline dating user:', error);
      }
    }

    // Update filtered climbers to exclude the rejected user (they don't want to see them again)
    setFilteredClimbers(prev => {
      const next = prev.filter(
        c => c.id !== climber.id
      );
      setCurrentIndex((current) => {
        if (next.length === 0) return 0;
        return Math.min(current, next.length - 1);
      });
      return next;
    });

    // Trigger a refresh of blocked users to pick up any new blocks
    setBlockRefreshTrigger(prev => prev + 1);

    if (process.env.EXPO_DEV_MODE) console.log('Rejected:', climber.name);
  };

  const currentClimber = filteredClimbers.length > 0 ? filteredClimbers[currentIndex] : null;
  const currentDatingCount = filteredClimbers.length;
  const currentPartnerCount = filteredPartners.length;

  const handleDatingCardAreaLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setDatingCardAreaHeight((prev) => (Math.abs(prev - nextHeight) > 4 ? nextHeight : prev));
  };

  useEffect(() => {
    if (introModalVisible) {
      hasShownDiscoverIntro = true;
    }
  }, [introModalVisible]);

  // Check if user has the required intent for the current mode
  const hasDatingIntent = user && intentIncludes(user.intent, 'date');
  const hasPartnerIntent = user && intentIncludes(user.intent, 'partner');

  // If only one mode is enabled, force it
  useEffect(() => {
    if (!hasDatingIntent && hasPartnerIntent) {
      setIsDatingMode(false);
    } else if (hasDatingIntent && !hasPartnerIntent) {
      setIsDatingMode(true);
    }
  }, [hasDatingIntent, hasPartnerIntent]);

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
        <SkeletonCard />
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
    <View style={[styles.container, { backgroundColor: isDatingMode ? theme.colors.background : darkMode ? '#15212A' : '#F2F8F8' }]}>
      <View style={styles.topSection}>
        <View style={[styles.searchBar, { borderColor: modeColors.accentSoft, backgroundColor: darkMode ? theme.colors.surface : '#ffffff' }]}>
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or gym..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchText}
            onChangeText={handleSearchChange}
          />
          <Pressable
            onPress={() => setFilterModalVisible(true)}
            style={[styles.filterButton, { backgroundColor: modeColors.accentSurface }]}>
            <Ionicons name="options" size={18} color={modeColors.accent} />
          </Pressable>
        </View>
      </View>

      {/* Mode Toggle - Show only if user has both intents */}
      {hasDatingIntent && hasPartnerIntent && (
        <View style={[styles.toggleContainer, { borderColor: modeColors.accentSoft }]}>
          <View style={styles.segmentedToggle}>
            <Pressable
              style={[styles.segmentButton, isDatingMode && styles.segmentButtonActive, isDatingMode && { backgroundColor: modeColors.accent }]}
              onPress={() => {
                setIsDatingMode(true);
                setCurrentIndex(0);
                setSearchText('');
              }}
            >
              <Text style={[styles.segmentButtonText, isDatingMode && styles.segmentButtonTextActive]}>
                Dating
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, !isDatingMode && styles.segmentButtonActive, !isDatingMode && { backgroundColor: modeColors.accent }]}
              onPress={() => {
                setIsDatingMode(false);
                setCurrentIndex(0);
                setSearchText('');
              }}
            >
              <Text
                style={[styles.segmentButtonText, !isDatingMode && styles.segmentButtonTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Climbing Partner
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Dating Mode - Swiping Cards */}
      {isDatingMode && hasDatingIntent ? (
        <View style={styles.cardContainer} onLayout={handleDatingCardAreaLayout}>
          {currentClimber ? (
            <SwipeableCard
              climber={currentClimber}
              onAccept={handleAccept}
              onReject={handleReject}
              onPress={() => showFullBio(currentClimber)}
              userLatitude={user?.latitude}
              userLongitude={user?.longitude}
              availableHeight={datingCardAreaHeight}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={modeColors.accent} />
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
        <View style={styles.partnerListContainer}>
          <FlatList
            data={filteredPartners}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.partnerListContent}
            renderItem={({ item }) => {
              // Construct avatar URL with priority: images array first, then avatar field
              let avatarUrl = '';
              if (item.id) {
                if (Array.isArray(item.images) && item.images.length > 0) {
                  avatarUrl = `${getPocketBaseUrl()}/api/files/users/${item.id}/${item.images[0]}?thumb=600x800`;
                } else if (item.avatar) {
                  avatarUrl = `${getPocketBaseUrl()}/api/files/users/${item.id}/${item.avatar}?thumb=600x800`;
                }
              }
              return (
              <Pressable onPress={() => openPartnerModal(item)} style={[styles.partnerCard, { borderColor: modeColors.accentSoft }]}>
                {avatarUrl ? (
                  <ImageBackground
                    source={{ uri: avatarUrl }}
                    style={styles.partnerCardImage}
                    imageStyle={styles.partnerCardImageStyle}
                  >
                    <LinearGradient
                      colors={['rgba(10,14,20,0.10)', 'rgba(10,14,20,0.78)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.partnerCardOverlay}
                    >
                      <View style={styles.partnerCardContent}>
                        <View style={styles.partnerInfo}>
                          <View style={styles.partnerHeaderRow}>
                            <Text style={styles.partnerNameOnImage}>{item.name}</Text>
                            <View style={styles.partnerChipOnImage}>
                              <Text style={styles.partnerChipTextOnImage}>Climbing Partner</Text>
                            </View>
                          </View>
                          <Text style={styles.partnerDetailOnImage}>{item.home_gym}</Text>
                          <Text style={styles.partnerDetailOnImage}>
                            {item.grade.value ? `${item.grade.value} (${item.grade.system})` : item.grade.general_level}
                          </Text>
                          <Text style={styles.partnerDetailOnImage} numberOfLines={1}>
                            {Array.isArray(item.climbing_styles) ? item.climbing_styles.join(' | ') : ''}
                          </Text>
                          {user?.latitude && user?.longitude && item.latitude && item.longitude && (
                            <View style={styles.partnerDistance}>
                              <Ionicons name="location" size={12} color="#ffffff" />
                              <Text style={styles.partnerDetailOnImage}>
                                {calculateDistance(user.latitude, user.longitude, item.latitude, item.longitude).toFixed(1)} km away
                              </Text>
                            </View>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                ) : (
                  <View style={styles.partnerCardContent}>
                    <View style={styles.partnerAvatarPlaceholder}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                    <View style={styles.partnerInfo}>
                      <View style={styles.partnerHeaderRow}>
                        <Text style={styles.partnerName}>{item.name}</Text>
                        <View style={[styles.partnerChip, { backgroundColor: modeColors.accentSurface }]}>
                          <Text style={[styles.partnerChipText, { color: modeColors.accent }]}>Climbing Partner</Text>
                        </View>
                      </View>
                      <Text style={styles.partnerDetail}>{item.home_gym}</Text>
                      <Text style={styles.partnerDetail}>
                        {item.grade.value ? `${item.grade.value} (${item.grade.system})` : item.grade.general_level}
                      </Text>
                      <Text style={styles.partnerDetail} numberOfLines={1}>
                        {Array.isArray(item.climbing_styles) ? item.climbing_styles.join(' | ') : ''}
                      </Text>
                      {user?.latitude && user?.longitude && item.latitude && item.longitude && (
                        <View style={styles.partnerDistance}>
                          <Ionicons name="location" size={12} color="#6b7280" />
                          <Text style={styles.partnerDetail}>
                            {calculateDistance(user.latitude, user.longitude, item.latitude, item.longitude).toFixed(1)} km away
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                  </View>
                )}
              </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.partnerEmptyState}>
                <Text style={styles.emptyText}>No climbing partners found.</Text>
              </View>
            }
          />
        </View>
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

      {/* Full Bio Detail Modal (Dating Mode) */}
      <Modal visible={bioDetailClimber !== null} transparent animationType="fade">
        <Pressable style={styles.bioModalOverlay} onPress={closeBioDetail}>
          <Pressable style={styles.bioModalContent} onPress={(e) => e.stopPropagation()}>
            {bioDetailClimber && (
              <>
                <View style={styles.bioModalHeader}>
                  <Text style={styles.bioModalTitle}>{bioDetailClimber.name}'s Bio</Text>
                  <Pressable onPress={closeBioDetail} style={styles.bioModalCloseBtn}>
                    <Ionicons name="close" size={24} color={theme.colors.accent} />
                  </Pressable>
                </View>
                <Text style={styles.bioModalText}>{bioDetailClimber.bio}</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Partner Detail Modal (Partner Mode) */}
      <PartnerDetailModal
        visible={partnerModalVisible}
        climber={partnerModalVisible ? selectedPartner : null}
        onClose={closePartnerModal}
        onSendRequest={handleSendPartnerRequest}
        onBlock={() => setBlockRefreshTrigger(prev => prev + 1)}
        userLatitude={user?.latitude}
        userLongitude={user?.longitude}
      />

      <Modal
        visible={introModalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setIntroModalVisible(false)}
      >
        <Pressable style={styles.introOverlay} onPress={() => setIntroModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={
                isDatingMode
                  ? darkMode
                    ? ['rgba(255,46,99,0.20)', 'rgba(255,120,150,0.10)']
                    : ['rgba(255,46,99,0.14)', 'rgba(255,180,205,0.10)']
                  : darkMode
                    ? ['rgba(52,211,207,0.20)', 'rgba(90,140,255,0.10)']
                    : ['rgba(26,166,163,0.14)', 'rgba(186,241,238,0.12)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <View style={styles.introHeader}>
                <Text style={styles.heroEyebrow}>Discover</Text>
                <Pressable onPress={() => setIntroModalVisible(false)} style={styles.introCloseButton}>
                  <Ionicons name="close" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
              <Text style={styles.heroTitle}>
                {isDatingMode ? 'Find your next spark' : 'Find your next climbing partner'}
              </Text>
              <Text style={styles.introBodyText}>
                Use the search and filters for quick narrowing, then switch modes any time from the toggle above the feed.
              </Text>
              <Pressable style={[styles.introActionButton, { backgroundColor: modeColors.accent }]} onPress={() => setIntroModalVisible(false)}>
                <Text style={styles.introActionText}>Start browsing</Text>
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
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    topSection: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
      backgroundColor: theme.colors.background,
    },
    heroCard: {
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      overflow: 'hidden',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
      backgroundColor: 'transparent',
    },
    heroTextWrap: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingRight: 12,
    },
    heroEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
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
    heroBadge: {
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
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 52,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 15,
    },
    filterButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,46,99,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleContainer: {
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      marginHorizontal: 16,
      marginTop: 2,
      marginBottom: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    toggleCopy: {
      backgroundColor: 'transparent',
      paddingRight: 0,
      marginBottom: 10,
    },
    toggleHint: {
      marginTop: 2,
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    segmentedToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 999,
      padding: 3,
      gap: 4,
      alignSelf: 'stretch',
    },
    segmentButton: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    segmentButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    segmentButtonTextActive: {
      color: '#ffffff',
    },
    cardContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 10,
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
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 15,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      maxWidth: 260,
      lineHeight: 22,
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
    partnerListContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    partnerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      minHeight: 152,
      marginBottom: 10,
      marginVertical: 0,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    partnerCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      padding: 16,
      minHeight: 152,
    },
    partnerCardImage: {
      minHeight: 152,
      justifyContent: 'flex-end',
    },
    partnerCardImageStyle: {
      borderRadius: 20,
    },
    partnerCardOverlay: {
      borderRadius: 20,
      minHeight: 152,
      justifyContent: 'flex-end',
    },
    partnerAvatar: {
      width: 64,
      height: 64,
      borderRadius: 20,
      marginRight: 14,
      backgroundColor: '#eee',
    },
    partnerAvatarPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 20,
      marginRight: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    partnerInfo: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    partnerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      marginBottom: 6,
      gap: 8,
    },
    partnerNameOnImage: {
      fontSize: 20,
      fontWeight: '700',
      color: '#ffffff',
      flex: 1,
    },
    partnerName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    partnerChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(26,166,163,0.12)',
    },
    partnerChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.edit,
    },
    partnerChipOnImage: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    partnerChipTextOnImage: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    partnerDetail: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    partnerDetailOnImage: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      marginTop: 4,
      lineHeight: 18,
    },
    partnerDistance: {
      flexDirection: 'row',
      backgroundColor: 'transparent',
      alignItems: 'center',
      marginTop: 8,
      gap: 4,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 28,
    },
    emptyStateDecoration: {
      width: 80,
      height: 80,
      marginTop: 24,
      opacity: 0.5,
    },
    partnerEmptyState: {
      alignItems: 'center',
      paddingTop: 32,
    },
    partnerEmptyDecoration: {
      width: 72,
      height: 72,
      marginBottom: 4,
      opacity: 0.45,
    },
    introOverlay: {
      flex: 1,
      backgroundColor: 'rgba(8,12,18,0.84)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    introCard: {
      width: '100%',
      borderRadius: 28,
      padding: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    introHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: 'transparent',
    },
    introCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.82)',
    },
    introModeRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginTop: 14,
      marginBottom: 14,
      backgroundColor: 'transparent',
    },
    introBodyText: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
      marginBottom: 18,
    },
    introActionButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
    },
    introActionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    bioModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bioModalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '85%',
      maxHeight: '75%',
    },
    bioModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: 'transparent',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    bioModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    bioModalCloseBtn: {
      padding: 4,
    },
    bioModalText: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
    },
  });

