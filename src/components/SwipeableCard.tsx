import { Text } from '@/components/Themed';
import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { useAuth } from '@/src/context/AuthContext';
import { calculateDistance, formatDistance } from '@/src/services/geoService';
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

  // Calculate distance on mount and when location/climber changes
  useEffect(() => {
    if (userLatitude && userLongitude && climber.latitude && climber.longitude) {
      const dist = calculateDistance(
        userLatitude,
        userLongitude,
        climber.latitude,
        climber.longitude
      );
      setDistance(dist);
    }
  }, [userLatitude, userLongitude, climber.latitude, climber.longitude]);

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
      onMoveShouldSetPanResponder: (evt, { dy, dx }) => {
        // Only activate pan responder if movement is significant (>10px)
        return Math.abs(dx) > 10 || Math.abs(dy) > 10;
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
          onPress={onPress}
          delayLongPress={500}
          onLongPress={() => setShowBlockReportMenu(true)}
          hitSlop={10}
          style={styles.card}>
          <ImageCarousel
            images={climber.images || []}
            userId={climber.id}
            expandable={true}
            height={"100%"}
            darkMode={darkMode}
            showIndicators={true}
          />

          {/* Top gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent']}
            style={styles.topGradient}
          />
          
          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
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
            {/* Name row */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {climber.name}
              </Text>
              <Text style={styles.age}>{climber.age}</Text>
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
                Animated.spring(rejectScale, { toValue: 0.85, useNativeDriver: true, tension: 300, friction: 8 }),
                Animated.spring(rejectScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
              ]).start();
              setIsRejecting(true);
              onReject(climber);
              setTimeout(() => setIsRejecting(false), 300);
            }}
            style={[styles.button, styles.rejectButton]}>
            <Ionicons name="close" size={28} color="#ef4444" />
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: acceptScale }] }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Animated.sequence([
                Animated.spring(acceptScale, { toValue: 0.85, useNativeDriver: true, tension: 300, friction: 8 }),
                Animated.spring(acceptScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
              ]).start();
              setIsAccepting(true);
              onAccept(climber);
              setTimeout(() => setIsAccepting(false), 300);
            }}
            style={[styles.button, styles.acceptButton]}>
            <Ionicons name="heart" size={28} color={theme.colors.success} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 18,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,46,99,0.18)',
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '22%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
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
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'JosefinSans_400Regular',
    letterSpacing: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stampLike: {
    color: '#1fde82',
    borderColor: '#1fde82',
  },
  stampNope: {
    color: '#ff4458',
    borderColor: '#ff4458',
  },

  // ── Info panel ───────────────────────────────────────────────────────────────
  contentPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: 'rgba(6,6,8,0.82)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: '#ffffff',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  age: {
    fontSize: 20,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: 'rgba(255,255,255,0.75)',
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
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(100,180,255,0.85)',
    marginLeft: 8,
  },
  bioPreview: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'nowrap',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  styleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'JosefinSans_400Regular',
    color: '#ffffff',
  },
  buttonContainer: {
    display: 'none',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  rejectButton: {
    borderColor: theme.colors.error,
  },
  acceptButton: {
    borderColor: theme.colors.success,
  },
});
