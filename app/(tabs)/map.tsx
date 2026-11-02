import { useAuth } from '@/src/context/AuthContext';
import { getGymMap, GymMapItem, GymMapPin, MapBounds } from '@/src/services/gymService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { MapPin, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

// The gym map: where the community climbs, never where a person is.
// Pins are gyms with a climber count; zoomed out they merge into bubbles.
// The server does the clustering (pb_hooks/gym_map.pb.js). See handoff/MAP-PLAN.md.

const DEBOUNCE_MS = 350;

// Somewhere sensible when we don't know where the user is: central Europe.
const FALLBACK_REGION: Region = {
  latitude: 50,
  longitude: 10,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

const regionToBounds = (r: Region): MapBounds => {
  let minLon = r.longitude - r.longitudeDelta / 2;
  let maxLon = r.longitude + r.longitudeDelta / 2;
  // Wrap into -180..180; a view across the date line ends up minLon > maxLon,
  // which the server understands.
  if (minLon < -180) minLon += 360;
  if (maxLon > 180) maxLon -= 360;
  if (r.longitudeDelta >= 360) {
    minLon = -180;
    maxLon = 180;
  }
  return {
    minLat: Math.max(-90, r.latitude - r.latitudeDelta / 2),
    maxLat: Math.min(90, r.latitude + r.latitudeDelta / 2),
    minLon,
    maxLon,
  };
};

const regionToZoom = (r: Region) =>
  Math.max(0, Math.min(20, Math.log2(360 / Math.max(r.longitudeDelta, 1e-6))));

export default function MapScreen() {
  const { user, token, darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  const mapRef = useRef<MapView>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRegionRef = useRef<Region | null>(null);

  const [items, setItems] = useState<GymMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<GymMapPin | null>(null);

  // Open on the user's own area if we know it. This is their own position,
  // only used on their own phone to centre the map.
  const lat = Number((user as any)?.latitude);
  const lon = Number((user as any)?.longitude);
  const initialRegion: Region =
    lat || lon
      ? { latitude: lat, longitude: lon, latitudeDelta: 0.6, longitudeDelta: 0.6 }
      : FALLBACK_REGION;

  const load = useCallback(
    async (region: Region) => {
      if (!token) return;
      lastRegionRef.current = region;
      // Only the newest request may update the screen; panning fast fires many.
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const next = await getGymMap(regionToBounds(region), regionToZoom(region), token);
        if (requestId !== requestIdRef.current) return;
        setItems(next);
        setFailed(false);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setFailed(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load(initialRegion);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Initial load only; later loads follow the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const onRegionChangeComplete = (region: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(region), DEBOUNCE_MS);
  };

  const zoomInto = (latitude: number, longitude: number) => {
    const current = lastRegionRef.current ?? initialRegion;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: current.latitudeDelta / 4,
        longitudeDelta: current.longitudeDelta / 4,
      },
      350
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={() => setSelected(null)}
        showsUserLocation
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        userInterfaceStyle={darkMode ? 'dark' : 'light'}
        customMapStyle={Platform.OS === 'android' && darkMode ? DARK_MAP_STYLE : undefined}
      >
        {items.map((item) =>
          item.type === 'cluster' ? (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={() => zoomInto(item.latitude, item.longitude)}
            >
              <View
                style={[
                  styles.cluster,
                  { transform: [{ scale: Math.min(1.6, 1 + Math.log10(item.gyms) / 2) }] },
                ]}
              >
                <Text style={styles.clusterCount}>{item.gyms}</Text>
                <Text style={styles.clusterLabel}>gyms</Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={(e) => {
                e.stopPropagation();
                setSelected(item);
              }}
            >
              <View
                style={[styles.pin, selected?.id === item.id && styles.pinSelected]}
              >
                <Users size={12} color="#fff" strokeWidth={2.5} />
                <Text style={styles.pinCount}>{item.climbers}</Text>
              </View>
            </Marker>
          )
        )}
      </MapView>

      {(loading || failed) && (
        <View style={styles.statusRow} pointerEvents="box-none">
          {failed ? (
            <Pressable
              style={styles.statusPill}
              onPress={() => lastRegionRef.current && load(lastRegionRef.current)}
            >
              <Text style={styles.statusText}>Couldn't load gyms. Tap to retry</Text>
            </Pressable>
          ) : (
            <View style={styles.statusPill}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          )}
        </View>
      )}

      {!loading && !failed && items.length === 0 && (
        <View style={styles.statusRow} pointerEvents="none">
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>No gyms here yet. Try zooming out</Text>
          </View>
        </View>
      )}

      {selected && (
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <MapPin size={20} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {selected.name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {selected.climbers === 1
                ? '1 climber calls this home'
                : `${selected.climbers} climbers call this home`}
            </Text>
          </View>
          <Pressable onPress={() => setSelected(null)} hitSlop={10}>
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    cluster: {
      minWidth: 44,
      height: 44,
      paddingHorizontal: 6,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      borderWidth: 3,
      borderColor: theme.colors.accent + '55',
    },
    clusterCount: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 16,
    },
    clusterLabel: {
      color: '#fff',
      fontSize: 9,
      opacity: 0.85,
      lineHeight: 10,
    },
    pin: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: '#fff',
    },
    pinSelected: {
      backgroundColor: theme.colors.primaryMedium,
    },
    pinCount: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    statusRow: {
      position: 'absolute',
      top: 12,
      left: 16,
      right: 16,
      alignItems: 'center',
    },
    statusPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    statusText: {
      color: theme.colors.text,
      fontSize: 13,
    },
    card: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent + '1A',
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    cardSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
  });

// Google Maps dark style for Android, matched to the app's dark theme.
// iOS gets Apple's own dark map via userInterfaceStyle.
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2430' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a94a6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#181f2a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#aeb7c4' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3442' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#121822' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4b5768' }] },
];
