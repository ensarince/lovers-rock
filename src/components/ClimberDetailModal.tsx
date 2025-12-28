import { Text } from '@/components/Themed';
import { theme } from '@/src/theme'; // Add import for theme
import { Climber, ClimbingGrade } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

interface ClimberDetailModalProps {
  climber: Climber | null;
  visible: boolean;
  onClose: () => void;
}

const gradeColors: Record<ClimbingGrade, string> = {
  beginner: theme.colors.success, // Use theme success
  intermediate: '#f59e0b', // Keep or map to theme
  advanced: theme.colors.error,
  expert: '#8b5cf6', // Keep or map
  elite: theme.colors.accent,
};

export const ClimberDetailModal: React.FC<ClimberDetailModalProps> = ({
  climber,
  visible,
  onClose,
}) => {
  if (!climber) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}>
            {/* Large Profile Image */}
            <Image
              source={{ uri: climber.image_url }}
              style={styles.profileImage}
            />

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <View>
                  <Text style={styles.name}>
                    {climber.name}, {climber.age}
                  </Text>
                  <Text style={styles.gym}>{climber.home_gym}</Text>
                </View>
              </View>

              {/* Bio */}
              <View style={styles.bioSection}>
                <Text style={styles.bioLabel}>About</Text>
                <Text style={styles.bio}>{climber.bio}</Text>
              </View>

              {/* Grade */}
              <View style={styles.section}>
                <Text style={styles.label}>Climbing Level</Text>
                <View
                  style={[
                    styles.badge,
                    styles.largeBadge,
                    {
                      backgroundColor: gradeColors[climber.grade],
                    },
                  ]}>
                  <Text style={styles.badgeText}>
                    {climber.grade.charAt(0).toUpperCase() +
                      climber.grade.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Climbing Styles */}
              <View style={styles.section}>
                <Text style={styles.label}>Climbing Styles</Text>
                <View style={styles.stylesContainer}>
                  {climber.climbing_styles.map((style) => (
                    <View
                      key={style}
                      style={[styles.badge, styles.styleBadge]}>
                      <Text style={styles.badgeText}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsSection}>
                <View style={styles.stat}>
                  <Ionicons name="pin" size={20} color={theme.colors.accent} />
                  <Text style={styles.statText}>{climber.home_gym}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="person" size={20} color={theme.colors.accent} />
                  <Text style={styles.statText}>{climber.age} years old</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 40,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileImage: {
    width: '100%',
    height: 400,
    backgroundColor: theme.colors.surface,
  },
  infoSection: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  gym: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bioSection: {
    marginBottom: 24,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  largeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  styleBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
