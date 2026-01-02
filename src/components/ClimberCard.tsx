import { Text, View } from '@/components/Themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import { theme } from '../themeDark';
import { Climber } from '../types/climber';

const { width } = Dimensions.get('window');

interface ClimberCardProps {
  climber: Climber;
  onAccept: (climber: Climber) => void;
  onReject: (climber: Climber) => void;
}

export const ClimberCard: React.FC<ClimberCardProps> = ({
  climber,
  onAccept,
  onReject,
}) => {
  return (
    <View style={styles.card}>
      <Image source={{ uri: climber.image_url }} style={styles.image} />
      <View style={styles.overlay}>
        <View style={styles.info}>
          <Text style={styles.name}>
            {climber.name}, {climber.age}
          </Text>
          <Text style={styles.grade}>{climber.grade} climber</Text>
          <Text style={styles.bio} numberOfLines={3}>
            {climber.bio}
          </Text>
          <Text style={styles.gym}>🏔️ {climber.home_gym}</Text>
          <Text style={styles.styles}>
            Styles: {climber.climbing_styles.join(', ')}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.rejectButton} onPress={() => onReject(climber)}>
          <Ionicons name="close" size={30} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.acceptButton} onPress={() => onAccept(climber)}>
          <Ionicons name="checkmark" size={30} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: width * 1.2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '70%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  info: {
    gap: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  grade: {
    fontSize: 16,
    color: theme.colors.accent,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.text,
  },
  gym: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  styles: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
