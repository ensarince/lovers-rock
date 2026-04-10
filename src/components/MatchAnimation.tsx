import { Text, View } from '@/components/Themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme as themeDark } from '../themeDark';
import { theme as themeLight } from '../themeLight';
import { Climber } from '../types/climber';

interface MatchAnimationProps {
  visible: boolean;
  climber: Climber;
  onClose: () => void;
}

export const MatchAnimation: React.FC<MatchAnimationProps> = ({
  visible,
  climber,
  onClose,
}) => {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  
  const [showContent, setShowContent] = useState(false);

  // Animation values
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const sparkle1Rotate = useRef(new Animated.Value(0)).current;
  const sparkle2Rotate = useRef(new Animated.Value(0)).current;
  const sparkle3Rotate = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset all animations
      heartScale.setValue(0);
      heartPulse.setValue(1);
      contentOpacity.setValue(0);
      sparkleOpacity.setValue(0);
      sparkleScale.setValue(0);
      sparkle1Rotate.setValue(0);
      sparkle2Rotate.setValue(0);
      sparkle3Rotate.setValue(0);
      modalScale.setValue(0);
      rippleScale.setValue(0);
      rippleOpacity.setValue(0.35);
      buttonScale.setValue(1);

      // Haptic celebration
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Celebratory ripple behind modal
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 2.8,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();

      // Start animation sequence
      Animated.sequence([
        // Modal appears
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
        // Heart appears with bounce
        Animated.spring(heartScale, {
          toValue: 1,
          tension: 150,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Sparkles animation
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(sparkleScale, {
            toValue: 1,
            tension: 200,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();

        // Rotating sparkles
        const rotateSparkles = () => {
          Animated.parallel([
            Animated.timing(sparkle1Rotate, {
              toValue: 1,
              duration: 4000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle2Rotate, {
              toValue: 1,
              duration: 3000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle3Rotate, {
              toValue: 1,
              duration: 5000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) {
              sparkle1Rotate.setValue(0);
              sparkle2Rotate.setValue(0);
              sparkle3Rotate.setValue(0);
              rotateSparkles();
            }
          });
        };
        rotateSparkles();
      }, 400);

      // Heart pulsing animation
      const pulseHeart = () => {
        Animated.sequence([
          Animated.timing(heartPulse, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            useNativeDriver: true,
          }),
          Animated.timing(heartPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && visible) {
            setTimeout(() => {
              if (visible) pulseHeart();
            }, 1000);
          }
        });
      };

      setTimeout(() => {
        pulseHeart();
      }, 800);

      // Show content after delay
      setTimeout(() => {
        setShowContent(true);
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, 1200);

      // Auto close after 5 seconds
      setTimeout(onClose, 5000);
    } else {
      setShowContent(false);
      // Reset animations when closing
      heartScale.setValue(0);
      heartPulse.setValue(1);
      contentOpacity.setValue(0);
      sparkleOpacity.setValue(0);
      sparkleScale.setValue(0);
      modalScale.setValue(0);
      rippleScale.setValue(0);
      rippleOpacity.setValue(0);
      buttonScale.setValue(1);
    }
  }, [visible]);

  const sparkle1RotateStyle = {
    transform: [
      {
        rotate: sparkle1Rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  const sparkle2RotateStyle = {
    transform: [
      {
        rotate: sparkle2Rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-360deg'],
        }),
      },
    ],
  };

  const sparkle3RotateStyle = {
    transform: [
      {
        rotate: sparkle3Rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animationContainer,
            {
              transform: [{ scale: modalScale }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Animated.View
              style={{
                transform: [
                  { scale: Animated.multiply(heartScale, heartPulse) }
                ],
              }}
            >
              <Ionicons name="heart" size={80} color={theme.colors.accent} />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.sparkles,
                {
                  opacity: sparkleOpacity,
                  transform: [{ scale: sparkleScale }],
                },
              ]}
            >
              <Animated.View style={[styles.sparkle1Position, sparkle1RotateStyle]}>
                <Ionicons
                  name="star"
                  size={20}
                  color={theme.colors.accent}
                />
              </Animated.View>
              <Animated.View style={[styles.sparkle2Position, sparkle2RotateStyle]}>
                <Ionicons
                  name="star"
                  size={15}
                  color={theme.colors.success}
                />
              </Animated.View>
              <Animated.View style={[styles.sparkle3Position, sparkle3RotateStyle]}>
                <Ionicons
                  name="star"
                  size={18}
                  color={theme.colors.primaryMedium}
                />
              </Animated.View>
              <Animated.View style={[styles.sparkle4Position, sparkle1RotateStyle]}>
                <Ionicons
                  name="diamond"
                  size={12}
                  color={theme.colors.accent}
                />
              </Animated.View>
              <Animated.View style={[styles.sparkle5Position, sparkle2RotateStyle]}>
                <Ionicons
                  name="diamond"
                  size={10}
                  color={theme.colors.success}
                />
              </Animated.View>
            </Animated.View>
          </View>
          
          {showContent && climber && (
            <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
              <Text style={styles.matchText}>It's a Match!</Text>
              <Text style={styles.subText}>
                You and {climber.name} liked each other
              </Text>
              <Text style={styles.description}>
                Start a conversation and plan your next climbing adventure together!
              </Text>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    Animated.sequence([
                      Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 8 }),
                      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
                    ]).start(() => onClose());
                  }}>
                  <Text style={styles.closeText}>Continue</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.accent,
  },
  animationContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 25,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 320,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkles: {
    position: 'absolute',
    width: 140,
    height: 140,
    top: -30,
    left: -30,
  },
  sparkle1Position: {
    position: 'absolute',
    top: 5,
    left: 15,
  },
  sparkle2Position: {
    position: 'absolute',
    top: 25,
    right: 10,
  },
  sparkle3Position: {
    position: 'absolute',
    bottom: 15,
    left: 25,
  },
  sparkle4Position: {
    position: 'absolute',
    top: 10,
    right: 25,
  },
  sparkle5Position: {
    position: 'absolute',
    bottom: 25,
    right: 15,
  },
  content: {
    alignItems: 'center',
  },
  matchText: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: 'CormorantGaramond_700Bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 16,
    color: theme.colors.accent,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'JosefinSans_400Regular',
    fontWeight: '600',
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  closeButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 35,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'JosefinSans_400Regular',
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});