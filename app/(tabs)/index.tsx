import { Text, View } from '@/components/Themed';
import { DiscoverFilters, FilterModal } from '@/src/components/FilterModal';
import { SwipeableCard } from '@/src/components/SwipeableCard';
import { getClimbers } from '@/src/services/mockData';
import { preferenceService } from '@/src/services/preferenceService';
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput
} from 'react-native';

export default function DiscoverScreen() {
  const [climbers, setClimbers] = useState<Climber[]>([]);
  const [filteredClimbers, setFilteredClimbers] = useState<Climber[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DiscoverFilters>({});

  useEffect(() => {
    const fetchClimbers = async () => {
      try {
        setLoading(true);
        const data = await getClimbers();
        setClimbers(data);
        setFilteredClimbers(data);
        setError(null);
      } catch (err) {
        setError('Failed to load climbers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClimbers();
  }, []);

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
    const filtered = applyFiltersAndSearch(climbers, text, activeFilters);
    setFilteredClimbers(filtered);
    setCurrentIndex(0);
  };

  const handleApplyFilters = (filters: DiscoverFilters) => {
    setActiveFilters(filters);
    const filtered = applyFiltersAndSearch(climbers, searchText, filters);
    setFilteredClimbers(filtered);
    setCurrentIndex(0);
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

  const handleAccept = (climber: Climber) => {
    preferenceService.accept(climber);
    setCurrentIndex((prev) => prev + 1);
    console.log('Accepted:', climber.name);
  };

  const handleReject = (climber: Climber) => {
    preferenceService.reject(climber);
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
          <Ionicons name="funnel" size={20} color="#ec4899" />
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
            <Ionicons name="checkmark-circle" size={64} color="#ec4899" />
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

      {/* Card Counter */}
      {currentClimber && (
        <View style={styles.counterContainer}>
          <Text style={styles.counter}>
            {currentIndex + 1} / {filteredClimbers.length}
          </Text>
        </View>
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={activeFilters}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#ffffff',
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
    color: '#ffffff',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  counter: {
    fontSize: 12,
    color: '#6b7280',
  },
});
