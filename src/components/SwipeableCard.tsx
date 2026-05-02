import { Text } from '@/components/Themed';
import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { useAuth } from '@/src/context/AuthContext';
import { formatDistance } from '@/src/services/geoService';
import { formatGradeDisplay } from '@/src/services/gradeService';
import { theme } from '@/src/themeDark';
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const windowHeight = Dimensions.get('window').height;
const FALLBACK_CARD_HEIGHT = Math.round(windowHeight * 0.70);

interface SwipeableCardProps {
  climber: Climber;
  onAccept: (climber: Climber) => void;
  onReject: (climber: Climber) => void;
  onPress?: () => void;
  userLatitude?: number;
  userLongitude?: number;
  availableHeight?: number;
}

const gradeColors: Record<string, string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
  expert: '#8b5cf6',
  elite: '#ec4899',
};

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  climber,
  onAccept,
  onReject,
  onPress,
  userLatitude,
  userLongitude,
  availableHeight,
}) => {
  const { darkMode } = useAuth();
  const pan = useRef(new Animated.ValueXY()).current;
  const acceptScale = useRef(new Animated.Value(1)).current;
  const rejectScale = useRef(new Animated.Value(1)).current;
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);
  const currentClimberRef = useRef(climber);

  // Cleanup on unmount

  // Use server-computed distance from /api/nearby-profiles (no raw coords needed)
  useEffect(() => {
    if (climber.distance_km !== null && climber.distance_km !== undefined) {
      setDistance(climber.distance_km);
    }
  }, [climber.distance_km]);

  // Update the ref when climber changes
  useEffect(() => {
    currentClimberRef.current = climber;
  }, [climber]);

  // Reset animation when climber changes
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [climber.id, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return false; // Don't claim touch at start, let Pressable handle taps
      },
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        // Only claim for clearly horizontal swipes — prevents stealing nav button taps
        return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 2;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, { dx, dy }) => {
        const threshold = 100;
        if (dx > threshold) {
          // Swipe right = accept
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Animated.timing(pan, {
            toValue: { x: 500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            onAccept(currentClimberRef.current);
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -threshold) {
          // Swipe left = reject
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            onReject(currentClimberRef.current);
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // Reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const rotateInterpolate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const opacityAccept = pan.x.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
  });

  const opacityReject = pan.x.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
  });

  const cardHeight =
    typeof availableHeight === 'number' && availableHeight > 0
      ? Math.max(300, availableHeight - 12)
      : FALLBACK_CARD_HEIGHT;

  return (
    <View style={styles.outerContainer}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            height: cardHeight,
            maxHeight: cardHeight,
          },
          {
            transform: [{ rotate: rotateInterpolate }],
          },
          pan.getLayout(),
          styles.cardShadow, 
        ]}>
        <Pressable
          delayLongPress={500}
          onLongPress={() => setShowBlockReportMenu(true)}
          style={styles.card}>
          {/* swipeNavEnabled=false: tap zones handle image nav, card PanResponder handles swipes */}
          <ImageCarousel
            images={climber.images || []}
            userId={climber.id}
            expandable={true}
            height={"100%"}
            darkMode={darkMode}
            showIndicators={false}
            swipeNavEnabled={false}
          />

          {/* Top gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.10)', 'transparent']}
            locations={[0, 0.4, 1]}
            style={styles.topGradient}
          />

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.88)']}
            locations={[0, 0.4, 1]}
            style={styles.gradientOverlay}
          />

          {/* LIKE stamp overlay */}
          <Animated.View
            style={[styles.stampOverlay, styles.stampRight, { opacity: opacityAccept }]}
            pointerEvents="none">
            <Text style={[styles.stampText, styles.stampLike]}>LIKE</Text>
          </Animated.View>

          {/* NOPE stamp overlay */}
          <Animated.View
            style={[styles.stampOverlay, styles.stampLeft, { opacity: opacityReject }]}
            pointerEvents="none">
            <Text style={[styles.stampText, styles.stampNope]}>NOPE</Text>
          </Animated.View>

          {/* Info panel — fixed height, never covers carousel dots */}
          <View style={styles.contentPanel}>
            {/* Name row — ⓘ button opens bio detail (only tappable element on the card) */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {climber.name}
              </Text>
              <Text style={styles.age}>{climber.age}</Text>
              {onPress && (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); onPress(); }}
                  hitSlop={10}
                  style={styles.infoButton}>
                  <Ionicons name="information-circle-outline" size={22} color="rgba(255,255,255,0.85)" />
                </Pressable>
              )}
            </View>

            {/* Gym + distance row */}
            <View style={styles.metaRow}>
              {climber.home_gym ? (
                <Text style={styles.gym} numberOfLines={1}>
                  <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.55)" /> {climber.home_gym}
                </Text>
              ) : null}
              {distance !== null && (
                <Text style={styles.distanceText}>
                  {formatDistance(distance)}
                </Text>
              )}
            </View>

            {/* Bio preview — strictly 1 line */}
            {climber.bio ? (
              <Text style={styles.bioPreview} numberOfLines={1} ellipsizeMode="tail">
                {climber.bio}
              </Text>
            ) : null}

            {/* Badges row */}
            <View style={styles.badgesContainer}>
              <View style={[styles.badge, { backgroundColor: gradeColors[climber.grade?.general_level || 'beginner'] }]}>
                <Text style={styles.badgeText}>{formatGradeDisplay(climber.grade)}</Text>
              </View>
              {climber.climbing_styles.slice(0, 2).map((style) => (
                <View key={style} style={[styles.badge, styles.styleBadge]}>
                  <Text style={styles.badgeText}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: rejectScale }] }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Animated.sequence([
                Animated.spring(rejectScale, { toValue: 0.82, useNativeDriver: true, tension: 400, friction: 7 }),
                Animated.spring(rejectScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
              ]).start();
              setIsRejecting(true);
              onReject(climber);
              setTimeout(() => setIsRejecting(false), 300);
            }}
            style={[styles.button, styles.rejectButton]}>
            <Ionicons name="close" size={30} color="#ef4444" />
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: acceptScale }] }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Animated.sequence([
                Animated.spring(acceptScale, { toValue: 0.82, useNativeDriver: true, tension: 400, friction: 7 }),
                Animated.spring(acceptScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
              ]).start();
              setIsAccepting(true);
              onAccept(climber);
              setTimeout(() => setIsAccepting(false), 300);
            }}
            style={[styles.button, styles.acceptButton]}>
            <Ionicons name="heart" size={28} color="#ffffff" />
          </Pressable>
        </Animated.View>
      </View>

      {/* Block/Report Menu */}
      <BlockReportMenu
        visible={showBlockReportMenu}
        userId={climber.id}
        userName={climber.name}
        onClose={() => setShowBlockReportMenu(false)}
        onBlock={() => onReject(climber)}
        darkMode={darkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '94%',
    alignItems: 'center',
    marginBottom: 8,
  },
  container: {
    width: '100%',
  },
  cardShadow: {
    shadowColor: '#FF2E63',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 20,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(255,46,99,0.22)',
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '28%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
  },

  // ── Stamp overlays ───────────────────────────────────────────────────────────
  stampOverlay: {
    position: 'absolute',
    top: 36,
    zIndex: 20,
  },
  stampRight: {
    right: 18,
    transform: [{ rotate: '12deg' }],
  },
  stampLeft: {
    left: 18,
    transform: [{ rotate: '-12deg' }],
  },
  stampText: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'JosefinSans_400Regular',
    letterSpacing: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 3.5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stampLike: {
    color: '#1fde82',
    borderColor: '#1fde82',
    textShadowColor: 'rgba(31,222,130,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  stampNope: {
    color: '#ff4458',
    borderColor: '#ff4458',
    textShadowColor: 'rgba(255,68,88,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // ── Info panel ───────────────────────────────────────────────────────────────
  contentPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    marginLeft: 'auto',
    padding: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  age: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gym: {
    fontSize: 12,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(255,255,255,0.62)',
    flex: 1,
    letterSpacing: 0.4,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(100,210,255,0.90)',
    marginLeft: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bioPreview: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 17,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'nowrap',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  styleBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'JosefinSans_400Regular',
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 14,
    paddingBottom: 4,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  rejectButton: {
    backgroundColor: 'rgba(35,22,22,0.95)',
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.6)',
  },
  acceptButton: {
    backgroundColor: '#FF2E63',
    borderWidth: 2,
    borderColor: 'rgba(255,46,99,0.7)',
  },
});
