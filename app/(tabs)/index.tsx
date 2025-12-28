import { Text, View } from '@/components/Themed';
import { DiscoverFilters, FilterModal } from '@/src/components/FilterModal';
import { MatchAnimation } from '@/src/components/MatchAnimation';
import { SwipeableCard } from '@/src/components/SwipeableCard';
import { useAuth } from '@/src/context/AuthContext';
import { preferenceService } from '@/src/services/preferenceService';
import { theme } from '@/src/theme'; // Add import for theme
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput
} from 'react-native';
import { getAllAccounts } from '../../src/services/accountService';

export default function DiscoverScreen() {
  const [climbers, setClimbers] = useState<Climber[]>([]);
  const [filteredClimbers, setFilteredClimbers] = useState<Climber[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DiscoverFilters>({});
  const [matchAnimationVisible, setMatchAnimationVisible] = useState(false);
  const [matchedClimber, setMatchedClimber] = useState<Climber | null>(null);
  const { token, user, preferencesSynced } = useAuth();

  // Reset currentIndex when search or filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchText, activeFilters]);

  // Reset currentIndex if it's out of bounds when filteredClimbers changes
  useEffect(() => {
    if (currentIndex >= filteredClimbers.length && filteredClimbers.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredClimbers.length]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (!token) return;
        
        // Preferences are already synced by AuthContext on login
        
        // Fetch climbers
        const data = await getAllAccounts(token);

        // Normalize climbing_styles and avatar URL for each climber
        const normalized = data
          // Exclude the current user from the list
          .filter((c) => c.id !== user?.id)
          .map((c) => {
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
        
        // Initially show all climbers, filter later when preferences are synced
        setFilteredClimbers(normalized);
        setError(null);
      } catch (err) {
        setError('Failed to load climbers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [token, user?.id]);

  // Filter climbers when preferences are synced
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      const notLiked = climbers.filter(c => !preferenceService.isAccepted(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters);
      setFilteredClimbers(filtered);
    }
  }, [preferencesSynced, climbers]);

  // Re-apply search and filters when they change
  useEffect(() => {
    if (preferencesSynced && climbers.length > 0) {
      const notLiked = climbers.filter(c => !preferenceService.isAccepted(c.id));
      const filtered = applyFiltersAndSearch(notLiked, searchText, activeFilters);
      setFilteredClimbers(filtered);
    }
  }, [searchText, activeFilters]);

  // Helper to check if user profile is complete
  const isProfileComplete =
    user &&
    user.name &&
    typeof user.age === 'number' &&
    user.grade &&
    Array.isArray(user.climbing_styles) && user.climbing_styles.length > 0 &&
    user.home_gym &&
    user.bio &&
    user.email;

  // Show prompt if profile is incomplete
  if (!isProfileComplete) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ec4899" />
        <Text style={styles.emptyTitle}>Complete your profile</Text>
        <Text style={styles.emptySubtitle}>
          Please fill out your profile before discovering other climbers.
        </Text>
        {/* Optionally, add a button to navigate to Edit Profile */}
      </View>
    );
  }

  const applyFiltersAndSearch = (
    baseClimbers: Climber[],
    search: string,
    filters: DiscoverFilters
  ) => {
    let result = [...baseClimbers];

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
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        {/* Error message can be added here */}
      </View>
    );
  }

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
      console.log(`⚠️ Already liked ${climber.name}, skipping`);
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    
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
    preferenceService.reject(climber);
    
    // Update filtered climbers to exclude the rejected user (they don't want to see them again)
    setFilteredClimbers(prev => prev.filter(c => c.id !== climber.id));
    
    setCurrentIndex((prev) => prev + 1);
    console.log('Rejected:', climber.name);
  };

  const currentClimber =
    filteredClimbers.length > 0 ? filteredClimbers[currentIndex] : null;
  const hasMoreClimbers = currentIndex < filteredClimbers.length - 1;
  const allCardsSeen = currentIndex >= filteredClimbers.length;


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

      {/* Card Container */}
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

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={activeFilters}
      />

      {/* Match Animation */}
      <MatchAnimation
        visible={matchAnimationVisible}
        climber={matchedClimber!}
        onClose={() => {
          setMatchAnimationVisible(false);
          setMatchedClimber(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
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
});
