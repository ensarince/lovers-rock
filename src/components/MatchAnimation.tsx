import { Text, View } from '@/components/Themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
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
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setShowContent(true), 500); // Delay to show content
      setTimeout(onClose, 4000); // Auto close after 4 seconds
    } else {
      setShowContent(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.animationContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={80} color={theme.colors.accent} />
            <View style={styles.sparkles}>
              <Ionicons
                name="star"
                size={20}
                color={theme.colors.accent}
                style={styles.sparkle1}
              />
              <Ionicons
                name="star"
                size={15}
                color={theme.colors.success}
                style={styles.sparkle2}
              />
              <Ionicons
                name="star"
                size={18}
                color={theme.colors.accent}
                style={styles.sparkle3}
              />
            </View>
          </View>
          {showContent && (
            <View style={styles.content}>
              <Text style={styles.matchText}>It's a Match!</Text>
              <Text style={styles.subText}>
                You and {climber.name} liked each other
              </Text>
              <Text style={styles.description}>
                Start a conversation and plan your next climbing adventure together!
              </Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>Continue</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 300,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  sparkles: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  sparkle1: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sparkle2: {
    position: 'absolute',
    top: 20,
    right: 0,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 0,
    left: 20,
  },
  content: {
    alignItems: 'center',
  },
  matchText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    fontSize: 18,
    color: theme.colors.accent,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});