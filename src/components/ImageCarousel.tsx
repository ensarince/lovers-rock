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
  expandable?: boolean; // Whether clicking image opens full modal
  height?: number | string;
  style?: any;
  darkMode: boolean;
  showIndicators?: boolean;
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
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const pan = useRef(new Animated.ValueXY()).current;
  const expandedPan = useRef(new Animated.ValueXY()).current;

  const getImageUrl = (filename: string) => {
    if (filename && userId) {
      const baseUrl = getPocketBaseUrl();
      return `${baseUrl}/api/files/users/${userId}/${filename}?thumb=800x800`;
    }
    return undefined;
  };

  const getThumbnailUrl = (filename: string) => {
    if (filename && userId) {
      const baseUrl = getPocketBaseUrl();
      return `${baseUrl}/api/files/users/${userId}/${filename}?thumb=200x200`;
    }
    return undefined;
  };

  const handleNextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImagePress = () => {
    if (expandable) {
      setExpandedImageIndex(currentIndex);
    }
    if (onImagePress) {
      onImagePress();
    }
  };

  // Pan responder for main carousel swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        // Activate if horizontal movement > 10px and greater than vertical movement
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, { dx }) => {
        const threshold = 40;
        if (dx > threshold) {
          // Swipe right = previous image
          Animated.spring(pan, {
            toValue: { x: width, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            handlePrevImage();
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -threshold) {
          // Swipe left = next image
          Animated.spring(pan, {
            toValue: { x: -width, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            handleNextImage();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // Not enough movement, reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Pan responder for expanded modal swipe
  const expandedPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: Animated.event([null, { dx: expandedPan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, { dx }) => {
        const threshold = 40;
        if (dx > threshold) {
          Animated.spring(expandedPan, {
            toValue: { x: width, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            setExpandedImageIndex((prev) =>
              prev! - 1 < 0 ? images.length - 1 : prev! - 1
            );
            expandedPan.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -threshold) {
          Animated.spring(expandedPan, {
            toValue: { x: -width, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            setExpandedImageIndex((prev) => (prev! + 1) % images.length);
            expandedPan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(expandedPan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (!images || images.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { height, backgroundColor: darkMode ? '#1a1a1e' : '#f5f5f5' },
          style,
        ]}>
        <View style={styles.placeholderContainer}>
          <Ionicons
            name="image"
            size={48}
            color={darkMode ? '#666' : '#ccc'}
          />
          <Text style={{ color: darkMode ? '#999' : '#999', marginTop: 8 }}>
            No images
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { height }, style]}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.imageContainer,
            pan.getLayout(),
          ]}>
          <Pressable
            onPress={handleImagePress}
            style={styles.imageContainer}>
            <Image
              source={{ uri: getThumbnailUrl(images[currentIndex]) }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
        </Animated.View>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Pressable
              onPress={handlePrevImage}
              style={[styles.navButton, styles.leftButton]}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handleNextImage}
              style={[styles.navButton, styles.rightButton]}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </Pressable>
          </>
        )}

        {/* Image indicators */}
        {images.length > 1 && showIndicators && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.indicatorActive,
                ]}>
                <View
                  style={[
                    styles.indicatorDot,
                    index === currentIndex && styles.indicatorDotActive,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>

      {/* Full-screen image modal */}
      {expandable && expandedImageIndex !== null && (
        <Modal
          visible={expandedImageIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedImageIndex(null)}>
          <View style={styles.expandedModal}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setExpandedImageIndex(null)}>
              <Ionicons name="close" size={32} color="#fff" />
            </Pressable>

            <Animated.View
              {...expandedPanResponder.panHandlers}
              style={[
                styles.expandedImageContainer,
                expandedPan.getLayout(),
              ]}>
              <Image
                source={{ uri: getImageUrl(images[expandedImageIndex]) }}
                style={styles.expandedImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Navigation in expanded view */}
            {images.length > 1 && (
              <>
                <Pressable
                  onPress={() => {
                    setExpandedImageIndex((prev) =>
                      prev! - 1 < 0 ? images.length - 1 : prev! - 1
                    );
                  }}
                  style={[styles.expandedNavButton, styles.expandedLeftButton]}>
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setExpandedImageIndex((prev) => (prev! + 1) % images.length);
                  }}
                  style={[styles.expandedNavButton, styles.expandedRightButton]}>
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </Pressable>

                <View style={styles.expandedIndicatorContainer}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.expandedIndicator,
                        index === expandedImageIndex && styles.expandedIndicatorActive,
                      ]}
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
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
  },
  leftButton: {
    left: 12,
  },
  rightButton: {
    right: 12,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -40 }],
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    padding: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
  },
  indicatorActive: {},
  counterContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  expandedImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: '100%',
    height: '100%',
  },
  expandedNavButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -30 }],
  },
  expandedLeftButton: {
    left: 20,
  },
  expandedRightButton: {
    right: 20,
  },
  expandedIndicatorContainer: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 8,
  },
  expandedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  expandedIndicatorActive: {
    backgroundColor: '#fff',
  },
  expandedCounterContainer: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -30 }],
  },
  expandedCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
