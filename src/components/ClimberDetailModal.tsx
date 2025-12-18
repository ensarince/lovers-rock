import { Text } from '@/components/Themed';
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
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
  expert: '#8b5cf6',
  elite: '#ec4899',
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
              <Ionicons name="close" size={28} color="#ffffff" />
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
                  <Ionicons name="pin" size={20} color="#ec4899" />
                  <Text style={styles.statText}>{climber.home_gym}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="person" size={20} color="#ec4899" />
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
    backgroundColor: '#0f172a',
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
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
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
    backgroundColor: '#1f2937',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  gym: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bioSection: {
    marginBottom: 24,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    color: '#ffffff',
  },
  styleBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    borderWidth: 1,
    borderColor: '#ec4899',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsSection: {
    backgroundColor: '#1f2937',
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
    color: '#d1d5db',
  },
});
