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
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

interface SwipeableCardProps {
  climber: Climber;
  onAccept: (climber: Climber) => void;
  onReject: (climber: Climber) => void;
  onPress?: () => void;
  userLatitude?: number;
  userLongitude?: number;
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
}) => {
  const { darkMode } = useAuth();
  const pan = useRef(new Animated.ValueXY()).current;
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);
  const currentClimberRef = useRef(climber);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle long press for block/report menu
  const handlePressIn = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowBlockReportMenu(true);
    }, 500); // 500ms long press
  };

  const handlePressOut = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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
        return true;
      },
      onMoveShouldSetPanResponder: (evt, { dy, dx }) => {
        // Only activate pan responder if movement is significant (>10px)
        return Math.abs(dx) > 10 || Math.abs(dy) > 10;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, { dx, dy }) => {
        // Check if this was just a tap (minimal movement)
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          return; // Let normal press handlers work
        }
        
        const threshold = 100;
        if (dx > threshold) {
          // Swipe right = accept
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

  return (
    <View style={styles.outerContainer}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [{ rotate: rotateInterpolate }],
          },
          pan.getLayout(),
          styles.cardShadow, 
        ]}>
        <Pressable 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.card}>
          <ImageCarousel
            images={climber.images || []}
            userId={climber.id}
            expandable={true}
            height="100%"
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

          {/* Accept overlay */}
          <Animated.View
            style={[
              styles.overlayLabel,
              styles.acceptOverlay,
              { opacity: opacityAccept },
            ]}>
            <Ionicons name="heart" size={60} color="#10b981" />
            <Text style={styles.overlayText}>LIKE!</Text>
          </Animated.View>

          {/* Reject overlay */}
          <Animated.View
            style={[
              styles.overlayLabel,
              styles.rejectOverlay,
              { opacity: opacityReject },
            ]}>
            <Ionicons name="close" size={60} color="#ef4444" />
            <Text style={styles.overlayText}>NOPE</Text>
          </Animated.View>

          {/* Content in a more transparent panel */}
          <View style={styles.contentPanel}>
            <Text style={styles.name}>
              {climber.name}, {climber.age}
            </Text>
            <Text style={styles.gym}>{climber.home_gym}</Text>
            <Text style={styles.bio} numberOfLines={2}>
              {climber.bio}
            </Text>
            <View style={styles.badgesContainer}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: gradeColors[climber.grade?.general_level || 'beginner'] },
                ]}>
                <Text style={styles.badgeText}>
                  {formatGradeDisplay(climber.grade)}
                </Text>
              </View>
              {climber.climbing_styles.slice(0, 2).map((style) => (
                <View key={style} style={[styles.badge, styles.styleBadge]}>
                  <Text style={styles.badgeText}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </Text>
                </View>
              ))}
              {distance !== null && (
                <View style={[styles.badge, styles.distanceBadge]}>
                  <Ionicons name="location" size={12} color="#fff" />
                  <Text style={styles.badgeText}>{formatDistance(distance)}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={() => {
            setIsRejecting(true);
            onReject(climber);
            setTimeout(() => setIsRejecting(false), 300);
          }}
          style={[styles.button, styles.rejectButton]}>
          <Ionicons name="close" size={28} color="#ef4444" />
        </Pressable>

        <Pressable
          onPress={() => {
            setIsAccepting(true);
            onAccept(climber);
            setTimeout(() => setIsAccepting(false), 300);
          }}
          style={[styles.button, styles.acceptButton]}>
          <Ionicons name="heart" size={28} color={theme.colors.success} />
        </Pressable>
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
    width: '90%',
    alignItems: 'center',
    marginBottom: 20,
  },
  container: {
    width: '100%',
    height: 450,
    maxHeight: 500,
    marginHorizontal: 'auto',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '18%',
  },
  menuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
  },
  overlayLabel: {
    position: 'absolute',
    top: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptOverlay: {
    right: 20,
  },
  rejectOverlay: {
    left: 20,
  },
  overlayText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  contentPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(24,24,28,0.45)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gym: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bio: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 16,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  styleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  distanceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
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
