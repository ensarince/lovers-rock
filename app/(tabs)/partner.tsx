import { DiscoverFilters, FilterModal } from '@/src/components/FilterModal';
import PartnerDetailModal from '@/src/components/PartnerDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { getAllAccounts } from '@/src/services/accountService';
import { acceptPartnerRequest, getIncomingPartnerRequests } from '@/src/services/matchData';
import { preferenceService } from '@/src/services/preferenceService';
import { theme } from '@/src/theme';
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export default function PartnerScreen() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState<Climber[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Climber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DiscoverFilters>({});
  const [selectedPartner, setSelectedPartner] = useState<Climber | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState<string[]>([]);
  const [acceptedUserIds, setAcceptedUserIds] = useState<string[]>([]); // users I have liked
  const [incomingRequests, setIncomingRequests] = useState<Climber[]>([]);
  const [acceptingRequestIds, setAcceptingRequestIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Fetch incoming partner requests for the current user
  const fetchIncomingRequests = async () => {
    if (!user || !token) return;
    try {
      const requests = await getIncomingPartnerRequests(user.id, token);
      setIncomingRequests(requests);
    } catch (e) {
      // Optionally handle error
    }
  };
  // Track users I have liked (for disabling request button and notification logic)
  useEffect(() => {
    if (!user || !token) return;
    const fetchAccepted = async () => {
      await preferenceService.syncPreferences(token, user.id);
      setAcceptedUserIds(preferenceService.getAccepted());
    };
    fetchAccepted();
  }, [user?.id, token, requestSentIds]);

  useEffect(() => {
    fetchIncomingRequests();
  }, [user?.id, token, acceptedUserIds]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        if (!token || !user) return;
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
        setPartners(filtered);
        setError(null);
      } catch (e) {
        setError('Failed to load partners');
      } finally {
        setLoading(false);
      }
    };
    if (token && user) fetchPartners();
  }, [token, user?.id, acceptedUserIds]);

  // Filter and search logic (match dating page)
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

  const handleApplyFilters = (filters: DiscoverFilters) => {
    setActiveFilters(filters);
    setFilterModalVisible(false);
  };

  // Modal open/close
  const openPartnerModal = (climber: Climber) => {
    setSelectedPartner(climber);
    setModalVisible(true);
  };
  const closePartnerModal = () => {
    setModalVisible(false);
    setSelectedPartner(null);
  };

  // Request logic: add target user to *my* liked_users (like dating page)
  const handleSendRequest = async (climber: Climber) => {
    if (!user || !token) {
      return;
    }
    if (acceptedUserIds.includes(climber.id)) {
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
      if (!likedUsers.includes(climber.id)) likedUsers.push(climber.id);
      // PATCH my liked_users
      const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ liked_users: likedUsers }),
      });
      setRequestSentIds((prev) => [...prev, climber.id]);
      setAcceptedUserIds((prev) => [...prev, climber.id]);
      // Do NOT close or reset modal here
      fetchIncomingRequests();
    } catch (e) {
      console.log('Error in handleSendRequest', e);
    }
  };

  // Only show content if user intent includes 'partner'
  const hasPartnerIntent = user && (Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner');
  if (!hasPartnerIntent) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="people-outline" size={64} color={theme.colors.border} />
        <Text style={{ fontSize: 18, color: theme.colors.text, marginTop: 16, textAlign: 'center' }}>
          Enable "Climbing Partner" in your profile to use this page.
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
      {/* Notification for incoming requests */}
      {incomingRequests.length > 0 && (
        <View style={{ backgroundColor: theme.colors.accent, padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6 }}>
            You have {incomingRequests.length} partner request(s):
          </Text>
          {incomingRequests.map((req) => (
            <Pressable
              key={req.id}
              style={{ backgroundColor: '#fff2', borderRadius: 6, marginBottom: 6, padding: 8, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => openPartnerModal(req)}
            >
              {req.avatar && req.id ? (
                <Image
                  source={{ uri: `http://${process.env.EXPO_PUBLIC_IP}:8090/api/files/users/${req.id}/${req.avatar}?thumb=100x100` }}
                  style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee' }}
                />
              ) : (
                <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
              )}
              <Text style={{ color: '#fff', flex: 1 }}>{req.name}</Text>
              <Pressable
                onPress={async (e) => {
                  e.stopPropagation();
                  setAcceptingRequestIds((ids) => [...ids, req.id]);
                  try {
                    await acceptPartnerRequest(user!.id, req.id, token!);
                    await fetchIncomingRequests(); // Re-fetch after accepting
                  } catch { }
                  setAcceptingRequestIds((ids) => ids.filter((id) => id !== req.id));
                }}
                style={{ backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4 }}
                disabled={acceptingRequestIds.includes(req.id)}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: 'bold' }}>
                  {acceptingRequestIds.includes(req.id) ? 'Accepting...' : 'Accept'}
                </Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
      {/* Search and Filter Bar (match dating page) */}
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
          onChangeText={setSearchText}
        />
        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={styles.filterButton}
        >
          <Ionicons name="funnel" size={20} color={theme.colors.accent} />
        </Pressable>
      </View>
      <FlatList
        data={filteredPartners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => openPartnerModal(item)} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.avatar && item.id ? (
                <Image
                  source={{ uri: `http://${process.env.EXPO_PUBLIC_IP}:8090/api/files/users/${item.id}/${item.avatar}?thumb=100x100` }}
                  style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#eee' }}
                />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.detail}>Gym: {item.home_gym}</Text>
                <Text style={styles.detail}>Grade: {item.grade}</Text>
                <Text style={styles.detail}>Styles: {Array.isArray(item.climbing_styles) ? item.climbing_styles.join(', ') : ''}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.errorText}>No partners found.</Text>}
      />
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={activeFilters}
      />
      {/* Always render PartnerDetailModal to avoid React static flag error */}
      <PartnerDetailModal
        visible={modalVisible}
        climber={modalVisible ? selectedPartner : null}
        onClose={closePartnerModal}
        onSendRequest={handleSendRequest}
        requestSent={selectedPartner ? requestSentIds.includes(selectedPartner.id) : false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 0,
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 12,
    marginVertical: 12,
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
