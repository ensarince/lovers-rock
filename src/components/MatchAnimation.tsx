import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Climber } from '../types/climber';

const { width: W } = Dimensions.get('window');
const ACCENT = '#FF2E63';

// 10 particles at evenly spaced angles around the heart
const PARTICLE_ANGLES = Array.from({ length: 10 }, (_, i) => (i / 10) * 2 * Math.PI);
const BURST_RADIUS = 100;
const particles = PARTICLE_ANGLES.map((angle) => ({
  tx: Math.cos(angle) * BURST_RADIUS,
  ty: Math.sin(angle) * BURST_RADIUS,
  color: i => ['#FF2E63', '#ff6b8a', '#ffffff', '#ffd6e0', '#ff4d79'][i % 5],
}));

interface MatchAnimationProps {
  visible: boolean;
  climber: Climber;
  onClose: () => void;
  onMessage?: () => void;
}

export const MatchAnimation: React.FC<MatchAnimationProps> = ({
  visible,
  climber,
  onClose,
  onMessage,
}) => {
  const [showContent, setShowContent] = useState(false);
  const insets = useSafeAreaInsets();

  // Overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Headline
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(-30)).current;

  // Heart
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;

  // Glow rings
  const glow1Scale = useRef(new Animated.Value(0.5)).current;
  const glow1Opacity = useRef(new Animated.Value(0)).current;
  const glow2Scale = useRef(new Animated.Value(0.3)).current;
  const glow2Opacity = useRef(new Animated.Value(0)).current;

  // Name + sub
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(20)).current;

  // Button
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(32)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Particles
  const particleAnims = useRef(
    particles.map(() => ({
      opacity: new Animated.Value(0),
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  const resetAll = () => {
    overlayOpacity.setValue(0);
    headlineOpacity.setValue(0);
    headlineY.setValue(-30);
    heartScale.setValue(0);
    heartPulse.setValue(1);
    glow1Scale.setValue(0.5);
    glow1Opacity.setValue(0);
    glow2Scale.setValue(0.3);
    glow2Opacity.setValue(0);
    nameOpacity.setValue(0);
    nameY.setValue(20);
    buttonOpacity.setValue(0);
    buttonY.setValue(32);
    buttonScale.setValue(1);
    particleAnims.forEach((p) => {
      p.opacity.setValue(0);
      p.tx.setValue(0);
      p.ty.setValue(0);
      p.scale.setValue(0);
    });
  };

  useEffect(() => {
    if (!visible) {
      setShowContent(false);
      resetAll();
      return;
    }

    resetAll();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Overlay in
    Animated.timing(overlayOpacity, {
      toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    // Headline slides in
    setTimeout(() => {
      setShowContent(true);
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headlineY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
    }, 150);

    // Heart + glow + particles burst
    setTimeout(() => {
      // Heart spring in
      Animated.spring(heartScale, {
        toValue: 1, tension: 200, friction: 5, useNativeDriver: true,
      }).start();

      // Inner glow
      Animated.parallel([
        Animated.timing(glow1Opacity, { toValue: 0.55, duration: 500, useNativeDriver: true }),
        Animated.spring(glow1Scale, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();

      // Outer glow (delayed, softer)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(glow2Opacity, { toValue: 0.25, duration: 600, useNativeDriver: true }),
          Animated.spring(glow2Scale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
        ]).start();
      }, 120);

      // Particles
      particleAnims.forEach((p, i) => {
        const { tx, ty } = particles[i];
        Animated.sequence([
          Animated.delay(i * 28),
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(p.tx, {
              toValue: tx, duration: 550,
              easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(p.ty, {
              toValue: ty, duration: 550,
              easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start();
      });
    }, 380);

    // Heart pulse loop
    setTimeout(() => {
      const pulse = () => {
        if (!visible) return;
        Animated.sequence([
          Animated.timing(heartPulse, {
            toValue: 1.13, duration: 750,
            easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true,
          }),
          Animated.timing(heartPulse, {
            toValue: 1, duration: 750,
            easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) setTimeout(pulse, 900);
        });
      };
      pulse();
    }, 900);

    // Name fade up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
    }, 720);

    // Button slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(buttonY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
    }, 980);

    // Auto-close
    setTimeout(onClose, 5500);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity, paddingBottom: Math.max(insets.bottom + 24, 64) }]}>
        <LinearGradient
          colors={['#0c0010', '#1c0025', '#110018', '#0a000e']}
          locations={[0, 0.4, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        {showContent && (
          <>
            {/* ── Headline ── */}
            <Animated.View
              style={[styles.headlineBlock, {
                opacity: headlineOpacity,
                transform: [{ translateY: headlineY }],
              }]}
            >
              <Text style={styles.eyebrow}>YOU MATCHED WITH</Text>
              <Text style={styles.headline}>It's a{'\n'}Match</Text>
            </Animated.View>

            {/* ── Heart + glow + particles ── */}
            <View style={styles.heartArea}>
              {/* Particles */}
              {particleAnims.map((p, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      backgroundColor: ['#FF2E63', '#ff6b8a', '#ffffff', '#ffd6e0', '#ff4d79', '#FF2E63', '#ff6b8a', '#ffffff', '#ffd6e0', '#ff4d79'][i],
                      opacity: p.opacity,
                      transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }],
                    },
                  ]}
                />
              ))}

              {/* Outer glow ring */}
              <Animated.View style={[
                styles.glowRing, styles.glowOuter,
                { opacity: glow2Opacity, transform: [{ scale: glow2Scale }] },
              ]} />

              {/* Inner glow ring */}
              <Animated.View style={[
                styles.glowRing, styles.glowInner,
                { opacity: glow1Opacity, transform: [{ scale: glow1Scale }] },
              ]} />

              {/* Heart */}
              <Animated.Text
                style={[
                  styles.heart,
                  { transform: [{ scale: Animated.multiply(heartScale, heartPulse) }] },
                ]}
              >
                ❤️
              </Animated.Text>
            </View>

            {/* ── Name + sub ── */}
            <Animated.View style={[
              styles.nameBlock,
              { opacity: nameOpacity, transform: [{ translateY: nameY }] },
            ]}>
              <Text style={styles.climberName}>{climber.name}</Text>
              <Text style={styles.subText}>liked you back</Text>
            </Animated.View>

            {/* ── CTA ── */}
            <Animated.View style={[
              styles.buttonWrap,
              { opacity: buttonOpacity, transform: [{ translateY: buttonY }, { scale: buttonScale }] },
            ]}>
              <Pressable
                style={styles.ctaButton}
                onPress={() => {
                  Animated.sequence([
                    Animated.spring(buttonScale, { toValue: 0.93, useNativeDriver: true, tension: 300, friction: 8 }),
                    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
                  ]).start(() => { onClose(); onMessage?.(); });
                }}
              >
                <Text style={styles.ctaText}>SEND A MESSAGE</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.skipText}>Keep Swiping</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 90,
    paddingHorizontal: 28,
  },

  // ── Headline ────────────────────────────────────────────────────────────────
  headlineBlock: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 3.5,
    marginBottom: 10,
  },
  headline: {
    fontSize: 64,
    fontFamily: 'CormorantGaramond_700Bold',
    color: '#ffffff',
    lineHeight: 66,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ── Heart area ───────────────────────────────────────────────────────────────
  heartArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    fontSize: 100,
    textAlign: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowInner: {
    width: 140,
    height: 140,
    backgroundColor: ACCENT,
  },
  glowOuter: {
    width: 200,
    height: 200,
    backgroundColor: ACCENT,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Name block ───────────────────────────────────────────────────────────────
  nameBlock: {
    alignItems: 'center',
    gap: 6,
  },
  climberName: {
    fontSize: 38,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 13,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Button ───────────────────────────────────────────────────────────────────
  buttonWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: ACCENT,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
  },
  ctaText: {
    fontSize: 13,
    fontFamily: 'JosefinSans_400Regular',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
  },
  skipText: {
    fontSize: 12,
    fontFamily: 'JosefinSans_400Regular',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
});
