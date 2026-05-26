import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  userId: string;
  onImagePress?: () => void;
  expandable?: boolean;
  height?: number | string;
  style?: any;
  darkMode: boolean;
  showIndicators?: boolean;
  /**
   * When false: uses left/right tap zones for navigation (no PanResponder).
   * Use inside SwipeableCard so the card's own PanResponder has no competition.
   * When true (default): uses swipe PanResponder + chevron nav buttons.
   */
  swipeNavEnabled?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  userId,
  onImagePress,
  expandable = true,
  height = 300,
  style,
  darkMode,
  showIndicators = true,
  swipeNavEnabled = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const expandedPan = useRef(new Animated.ValueXY()).current;

  const getImageUrl = (filename: string) => {
    if (filename && userId) {
      return `${getPocketBaseUrl()}/api/files/users/${userId}/${filename}?thumb=800x800`;
    }
    return undefined;
  };

  const getThumbnailUrl = (filename: string) => {
    if (filename && userId) {
      return `${getPocketBaseUrl()}/api/files/users/${userId}/${filename}?thumb=200x200`;
    }
    return undefined;
  };

  const handleNextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleImagePress = () => {
    if (expandable) setExpandedImageIndex(currentIndex);
    if (onImagePress) onImagePress();
  };

  // Swipe PanResponder — only used when swipeNavEnabled=true (modal contexts)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, { dx }) => {
        if (dx > 40) {
          Animated.spring(pan, { toValue: { x: width, y: 0 }, useNativeDriver: false }).start(() => {
            handlePrevImage();
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -40) {
          Animated.spring(pan, { toValue: { x: -width, y: 0 }, useNativeDriver: false }).start(() => {
            handleNextImage();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  // Expanded modal PanResponder.
  // onStart = false so child Pressables (close, nav buttons) still fire on taps.
  // onMove = true on any horizontal drag so swipes are always captured here,
  // never leaking to the card behind (Modal is a separate native layer anyway).
  const expandedPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: Animated.event([null, { dx: expandedPan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, { dx }) => {
        if (dx > 50) {
          Animated.spring(expandedPan, { toValue: { x: width, y: 0 }, useNativeDriver: false }).start(() => {
            setExpandedImageIndex((prev) => (prev! - 1 < 0 ? images.length - 1 : prev! - 1));
            expandedPan.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -50) {
          Animated.spring(expandedPan, { toValue: { x: -width, y: 0 }, useNativeDriver: false }).start(() => {
            setExpandedImageIndex((prev) => (prev! + 1) % images.length);
            expandedPan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(expandedPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { height, backgroundColor: darkMode ? '#1a1a1e' : '#f5f5f5' }, style]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="image" size={48} color={darkMode ? '#666' : '#ccc'} />
          <Text style={{ color: '#999', marginTop: 8 }}>No images</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { height }, style]}>
        {swipeNavEnabled ? (
          // ── Pan-swipe mode (used in modals / detail views) ──────────────────
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.imageContainer, pan.getLayout()]}>
            <Pressable onPress={handleImagePress} style={styles.imageContainer}>
              <Image
                source={{ uri: getThumbnailUrl(images[currentIndex]) }}
                style={styles.image}
                resizeMode="cover"
              />
            </Pressable>
          </Animated.View>
        ) : (
          // ── Tap-zone mode (used inside SwipeableCard) ────────────────────────
          // No PanResponder here — the card's PanResponder handles all drags.
          // Navigation is via left/right tap zones; center tap opens full-screen.
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getThumbnailUrl(images[currentIndex]) }}
              style={styles.image}
              resizeMode="cover"
            />
            {images.length > 1 && (
              <Pressable
                style={styles.leftTapZone}
                onPress={(e) => { e.stopPropagation(); handlePrevImage(); }}
              />
            )}
            {images.length > 1 && (
              <Pressable
                style={styles.rightTapZone}
                onPress={(e) => { e.stopPropagation(); handleNextImage(); }}
              />
            )}
            {expandable && (
              <Pressable
                style={styles.centerTapZone}
                onPress={(e) => { e.stopPropagation(); handleImagePress(); }}
              />
            )}
          </View>
        )}

        {/* Chevron nav buttons — only in swipe mode */}
        {swipeNavEnabled && images.length > 1 && (
          <>
            <Pressable
              onPress={(e) => { e.stopPropagation(); handlePrevImage(); }}
              style={[styles.navButton, styles.leftButton]}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleNextImage(); }}
              style={[styles.navButton, styles.rightButton]}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </Pressable>
          </>
        )}

        {/* Indicator dots */}
        {images.length > 1 && showIndicators && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <Pressable
                key={index}
                onPress={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                style={styles.indicator}>
                <View style={[styles.indicatorDot, index === currentIndex && styles.indicatorDotActive]} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>{currentIndex + 1} / {images.length}</Text>
          </View>
        )}
      </View>

      {/* ── Full-screen expanded modal ─────────────────────────────────────── */}
      {expandable && expandedImageIndex !== null && (
        <Modal
          visible={expandedImageIndex !== null}
          animationType="fade"
          onRequestClose={() => setExpandedImageIndex(null)}>
          {/*
            Plain View (NOT Pressable) as the root — a Pressable would fire onPress on
            any touch-end including mid-swipe, which closed the modal and sent the
            orphaned gesture to the card behind. The ✕ button is the only close target.
          */}
          <View style={styles.expandedModal}>
            {/* Full-screen swipe area */}
            <Animated.View
              {...expandedPanResponder.panHandlers}
              style={[styles.expandedImageContainer, expandedPan.getLayout()]}>
              <Image
                source={{ uri: getImageUrl(images[expandedImageIndex]) }}
                style={styles.expandedImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Close button — rendered after swipe area so it sits on top */}
            <Pressable style={styles.closeButton} onPress={() => setExpandedImageIndex(null)}>
              <Ionicons name="close" size={32} color="#fff" />
            </Pressable>

            {images.length > 1 && (
              <>
                <Pressable
                  onPress={() => setExpandedImageIndex((prev) => (prev! - 1 < 0 ? images.length - 1 : prev! - 1))}
                  style={[styles.expandedNavButton, styles.expandedLeftButton]}>
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setExpandedImageIndex((prev) => (prev! + 1) % images.length)}
                  style={[styles.expandedNavButton, styles.expandedRightButton]}>
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </Pressable>
                <View style={styles.expandedIndicatorContainer}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[styles.expandedIndicator, index === expandedImageIndex && styles.expandedIndicatorActive]}
                    />
                  ))}
                </View>
              </>
            )}

            <View style={styles.expandedCounterContainer}>
              <Text style={styles.expandedCounterText}>
                {expandedImageIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Tap zones (card mode only) ───────────────────────────────────────────
  leftTapZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '33%',
    height: '80%', // leave bottom 20% for content panel / dots area
    zIndex: 6,
  },
  rightTapZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '33%',
    height: '80%',
    zIndex: 6,
  },
  centerTapZone: {
    position: 'absolute',
    left: '33%',
    right: '33%',
    top: 0,
    height: '80%',
    zIndex: 6,
  },

  // ── Chevron nav buttons (swipe mode only) ────────────────────────────────
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
    zIndex: 8,
    elevation: 8,
  },
  leftButton: { left: 12 },
  rightButton: { right: 12 },

  // ── Indicators ───────────────────────────────────────────────────────────
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -40 }],
    flexDirection: 'row',
    gap: 6,
    zIndex: 8,
    elevation: 8,
  },
  indicator: { padding: 6 },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  indicatorDotActive: { backgroundColor: '#fff' },

  // ── Counter ──────────────────────────────────────────────────────────────
  counterContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 8,
    elevation: 8,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // ── Expanded modal ───────────────────────────────────────────────────────
  expandedModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
  },
  expandedImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: { width: '100%', height: '100%' },
  expandedNavButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -30 }],
    zIndex: 10,
  },
  expandedLeftButton: { left: 20 },
  expandedRightButton: { right: 20 },
  expandedIndicatorContainer: {
    position: 'absolute',
    bottom: 48,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 8,
  },
  expandedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  expandedIndicatorActive: { backgroundColor: '#fff' },
  expandedCounterContainer: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -30 }],
  },
  expandedCounterText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
