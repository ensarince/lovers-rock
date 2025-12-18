import { Text } from '@/components/Themed';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Climber, ClimbingGrade } from '../../src/types/climber';

interface ClimberCardProps {
  climber: Climber;
  onPress?: () => void;
}

const gradeColors: Record<ClimbingGrade, string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
  expert: '#8b5cf6',
  elite: '#ec4899',
};

export const ClimberCard: React.FC<ClimberCardProps> = ({ climber, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.card}>
        {/* Profile Image */}
        <Image source={{ uri: climber.image_url }} style={styles.image} />

        {/* Overlay gradient effect */}
        <View style={styles.overlay} />

        {/* Content */}
        <View style={styles.content}>
          {/* Name and Age */}
          <Text style={styles.name}>
            {climber.name}, {climber.age}
          </Text>

          {/* Home Gym */}
          <Text style={styles.gym}>{climber.home_gym}</Text>

          {/* Bio */}
          <Text style={styles.bio} numberOfLines={2}>
            {climber.bio}
          </Text>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {/* Grade Badge */}
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

            {/* Style Badges */}
            {climber.climbing_styles.slice(0, 2).map((style: string) => (
              <View key={style} style={[styles.badge, styles.styleBadge]}>
              <Text style={styles.badgeText}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 380,
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
});
