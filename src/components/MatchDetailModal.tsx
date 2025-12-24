import { Text, View } from '@/components/Themed';
import { Match } from '@/src/services/matchData';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface MatchDetailModalProps {
  visible: boolean;
  match: Match | null;
  onClose: () => void;
  onMessage: (match: Match) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  visible,
  match,
  onClose,
  onMessage,
}) => {
  if (!match) return null;

  const { climber } = match;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: climber.image_url || climber.avatar }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>

          {/* Profile Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.name}>
              {climber.name}, {climber.age}
            </Text>
            <Text style={styles.grade}>
              {climber.grade} climber
            </Text>
            <Text style={styles.gym}>
              🏔️ {climber.home_gym}
            </Text>

            {/* Climbing Styles */}
            <View style={styles.stylesContainer}>
              <Text style={styles.sectionTitle}>Climbing Styles</Text>
              <View style={styles.stylesList}>
                {climber.climbing_styles.map((style, index) => (
                  <View key={index} style={styles.styleChip}>
                    <Text style={styles.styleText}>{style}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bio */}
            {climber.bio && (
              <View style={styles.bioContainer}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bio}>{climber.bio}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.messageButton}
            onPress={() => onMessage(match)}
          >
            <Ionicons name="chatbubble" size={20} color="#ffffff" />
            <Text style={styles.messageButtonText}>Message</Text>
          </Pressable>

          <Pressable style={styles.moreButton} onPress={() => {}}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#a1a1aa" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    borderWidth: 4,
    borderColor: '#ec4899',
  },
  infoContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100, // Space for action buttons
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  grade: {
    fontSize: 18,
    color: '#ec4899',
    textAlign: 'center',
    marginBottom: 16,
  },
  gym: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
  },
  stylesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  stylesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    backgroundColor: '#23232a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  styleText: {
    color: '#ec4899',
    fontSize: 14,
    fontWeight: '500',
  },
  bioContainer: {
    marginBottom: 24,
  },
  bio: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16,
    backgroundColor: '#101014',
    borderTopWidth: 1,
    borderTopColor: '#23232a',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    gap: 8,
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  moreButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23232a',
    paddingVertical: 16,
    borderRadius: 12,
  },
});