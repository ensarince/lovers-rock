import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function usePulse() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return opacity;
}

// ─── Discover card skeleton ────────────────────────────────────────────────────

export function SkeletonCard() {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const opacity = usePulse();

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, opacity },
      ]}
    >
      {/* Bottom info panel mimic */}
      <View style={[styles.cardBottom, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.skLine, styles.skLineLarge, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.skLine, styles.skLineSmall, { backgroundColor: theme.colors.border, width: '50%' }]} />
        <View style={[styles.skLine, styles.skLineSmall, { backgroundColor: theme.colors.border, width: '70%' }]} />
        <View style={styles.skBadgeRow}>
          {[80, 90, 70].map((w, i) => (
            <View key={i} style={[styles.skBadge, { backgroundColor: theme.colors.border, width: w }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Row skeleton (messages / matches) ────────────────────────────────────────

interface SkeletonRowProps {
  count?: number;
}

export function SkeletonRow({ count = 4 }: SkeletonRowProps) {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const opacity = usePulse();

  return (
    <Animated.View style={{ opacity }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.row,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={[styles.rowAvatar, { backgroundColor: theme.colors.surface }]} />
          <View style={styles.rowLines}>
            <View style={[styles.skLine, styles.skLineMedium, { backgroundColor: theme.colors.surface, width: '55%' }]} />
            <View style={[styles.skLine, styles.skLineSmall, { backgroundColor: theme.colors.surface, width: '80%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Profile skeleton ──────────────────────────────────────────────────────────

export function SkeletonProfile() {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const opacity = usePulse();

  return (
    <Animated.View style={[styles.profileContainer, { opacity }]}>
      {/* Avatar */}
      <View style={[styles.profileAvatar, { backgroundColor: theme.colors.surface }]} />
      {/* Name line */}
      <View style={[styles.skLine, styles.skLineLarge, { backgroundColor: theme.colors.surface, alignSelf: 'center', width: '50%', marginTop: 16 }]} />
      {/* Sub line */}
      <View style={[styles.skLine, styles.skLineSmall, { backgroundColor: theme.colors.surface, alignSelf: 'center', width: '35%', marginTop: 8 }]} />
      {/* Content blocks */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.profileBlock, { backgroundColor: theme.colors.surface }]} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Card skeleton
  card: {
    width: '94%',
    height: 350,
    borderRadius: 24,
    alignSelf: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  cardBottom: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 8,
  },
  skLine: {
    borderRadius: 6,
    height: 14,
  },
  skLineLarge: {
    height: 20,
    width: '65%',
  },
  skLineMedium: {
    height: 16,
  },
  skLineSmall: {
    height: 12,
  },
  skBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  skBadge: {
    height: 28,
    borderRadius: 14,
  },
  // Row skeleton
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  rowLines: {
    flex: 1,
    gap: 4,
  },
  // Profile skeleton
  profileContainer: {
    flex: 1,
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  profileAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: 'center',
  },
  profileBlock: {
    height: 64,
    borderRadius: 12,
    marginTop: 12,
  },
});
