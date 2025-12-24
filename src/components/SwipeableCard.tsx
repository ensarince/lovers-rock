import { Text } from '@/components/Themed';
import { Climber, ClimbingGrade } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
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
}

const gradeColors: Record<ClimbingGrade, string> = {
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
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const currentClimberRef = useRef(climber);

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
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, { dx }) => {
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

  // Construct the full image URL if only the filename is provided
  const getImageUrl = () => {
    if (climber.avatar && climber.id) {
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      return `${baseUrl}/api/files/users/${climber.id}/${climber.avatar}?thumb=100x100`;
    }
    return undefined;
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{ rotate: rotateInterpolate }],
        },
        pan.getLayout(),
      ]}>
      <Pressable onPress={onPress} style={styles.card}>
        <Image source={{ uri: getImageUrl() }} style={styles.image} />

        <View style={styles.overlay} />

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

        {/* Content */}
        <View style={styles.content}>
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
                { backgroundColor: gradeColors[climber.grade] },
              ]}>
              <Text style={styles.badgeText}>
                {climber.grade.charAt(0).toUpperCase() +
                  climber.grade.slice(1)}
              </Text>
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
          <Ionicons name="heart" size={28} color="#ec4899" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    height: '80%',
    maxHeight: 600,
    marginBottom: 30,
    marginHorizontal: 'auto',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: '100%',
    backgroundColor: '#1f2937',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  gym: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: '#e5e7eb',
    lineHeight: 18,
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
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
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 12,
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
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  acceptButton: {
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
});
