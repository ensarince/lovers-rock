import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY || '';
const GIPHY_SEARCH = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING = 'https://api.giphy.com/v1/gifs/trending';
const GIF_LIMIT = 20;

interface GifItem {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  darkMode: boolean;
}

export function GifSearchModal({ visible, onClose, onSelect, darkMode }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    try {
      const endpoint = searchQuery.trim() ? GIPHY_SEARCH : GIPHY_TRENDING;
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        limit: String(GIF_LIMIT),
        rating: 'g',
        ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
      });
      const resp = await fetch(`${endpoint}?${params}`);
      const json = await resp.json();
      const items: GifItem[] = (json.data || []).map((item: any) => {
        const preview = item.images?.fixed_height_small || item.images?.fixed_height || {};
        const full = item.images?.fixed_height || {};
        return {
          id: item.id,
          url: full.url || '',
          previewUrl: preview.url || full.url || '',
          width: parseInt(preview.width || '200', 10),
          height: parseInt(preview.height || '150', 10),
        };
      });
      setGifs(items.filter((g) => g.url));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setQuery('');
      fetchGifs('');
    }
  }, [visible, fetchGifs]);

  useEffect(() => {
    const timer = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(timer);
  }, [query, fetchGifs]);

  const bg = darkMode ? '#18181b' : '#f4f4f5';
  const inputBg = darkMode ? '#27272a' : '#e4e4e7';
  const textColor = darkMode ? '#ffffff' : '#18181b';
  const placeholderColor = darkMode ? '#71717a' : '#a1a1aa';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Search GIFs..."
              placeholderTextColor={placeholderColor}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={textColor} />
            </Pressable>
          </View>

          {!GIPHY_API_KEY ? (
            <Text style={styles.noKeyText}>Set EXPO_PUBLIC_GIPHY_API_KEY to enable GIFs</Text>
          ) : loading ? (
            <ActivityIndicator style={styles.loader} color="#6366f1" size="large" />
          ) : (
            <FlatList
              data={gifs}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.gifItem}
                  onPress={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                >
                  <Image
                    source={{ uri: item.previewUrl }}
                    style={styles.gifImage}
                    resizeMode="cover"
                  />
                </Pressable>
              )}
              contentContainerStyle={styles.gifGrid}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={{ height: 8 }} />}
            />
          )}

          <View style={styles.attribution}>
            <Image
              source={require('../../assets/giphyLogo.gif')}
              style={styles.attributionLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    height: '65%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  closeButton: {
    padding: 4,
  },
  loader: {
    flex: 1,
  },
  noKeyText: {
    color: '#ef4444',
    padding: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  gifGrid: {
    paddingHorizontal: 6,
    paddingBottom: 16,
  },
  gifItem: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#27272a',
  },
  gifImage: {
    width: '100%',
    aspectRatio: 1.4,
  },
  attribution: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3f3f46',
  },
  attributionLogo: {
    width: 120,
    height: 28,
  },
});
