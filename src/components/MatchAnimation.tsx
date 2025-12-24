import { Climber } from '@/src/types/climber';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface MatchAnimationProps {
  climber: Climber;
  onClose: () => void;
  visible: boolean;
}

const { width, height } = Dimensions.get('window');

export const MatchAnimation: React.FC<MatchAnimationProps> = ({
  climber,
  onClose,
  visible,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      heartScaleAnim.setValue(0);

      // Start animation sequence
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Heart animation with delay
      setTimeout(() => {
        Animated.spring(heartScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 500);
    }
  }, [visible]);

  if (!visible) return null;

  const getImageUrl = () => {
    if (climber.avatar && climber.id) {
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      return `${baseUrl}/api/files/users/${climber.id}/${climber.avatar}?thumb=300x300`;
    }
    return undefined;
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable style={styles.overlayPressable} onPress={onClose}>
        <Animated.View
          style={[
            styles.matchCard,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Hearts background */}
          <View style={styles.heartsContainer}>
            {[...Array(6)].map((_, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.floatingHeart,
                  {
                    left: Math.random() * width * 0.8,
                    top: Math.random() * height * 0.6,
                    transform: [{ scale: heartScaleAnim }],
                    opacity: heartScaleAnim,
                  },
                ]}
              >
                ❤️
              </Animated.Text>
            ))}
          </View>

          <View style={styles.matchContent}>
            <Animated.Text
              style={[
                styles.matchTitle,
                {
                  transform: [{ scale: heartScaleAnim }],
                },
              ]}
            >
              🎉 IT'S A MATCH! 🎉
            </Animated.Text>

          <View style={styles.profilesContainer}>
              <View style={styles.heartWrapper}>
                <Text style={styles.bigHeart}>💖</Text>
              </View>

              <View style={styles.profileCard}>
                <Image source={{ uri: getImageUrl() }} style={styles.profileImage} />
                <Text style={styles.profileName}>{climber.name}, {climber.age}</Text>
                <Text style={styles.profileGrade}>{climber.grade}</Text>
              </View>
            </View>

            <Text style={styles.matchMessage}>
              You and {climber.name} liked each other!{'\n'}Start a conversation now.
            </Text>

            <Pressable style={styles.keepSwipingButton} onPress={onClose}>
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: 350,
  },
  heartsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  floatingHeart: {
    position: 'absolute',
    fontSize: 24,
  },
  matchContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ec4899',
    textAlign: 'center',
    marginBottom: 20,
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heartWrapper: {
    marginHorizontal: 20,
  },
  bigHeart: {
    fontSize: 60,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    minWidth: 120,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#e5e7eb',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  profileGrade: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  matchMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  keepSwipingButton: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#ec4899',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  keepSwipingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});