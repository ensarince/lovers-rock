import { Text, View } from '@/components/Themed';
import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { useAuth } from '@/src/context/AuthContext';
import { calculateDistance, formatDistance } from '@/src/services/geoService';
import { formatGradeDisplay } from '@/src/services/gradeService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Match } from '@/src/types/match';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
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
  onUnmatch?: (matchId: string) => void;
  userLatitude?: number;
  userLongitude?: number;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  visible,
  match,
  onClose,
  onMessage,
  onUnmatch,
  userLatitude,
  userLongitude,
}) => {
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);

  const handleUnmatch = () => {
    if (match && onUnmatch) {
      onUnmatch(match.id);
      setShowBlockReportMenu(false);
      onClose(); // Close the modal after unmatching
    }
  };

  useEffect(() => {
    if (match && userLatitude && userLongitude && match.climber.latitude && match.climber.longitude) {
      const dist = calculateDistance(
        userLatitude,
        userLongitude,
        match.climber.latitude,
        match.climber.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [match, userLatitude, userLongitude]);

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
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Images Carousel */}
          <View style={styles.imageContainer}>
            {climber.images && climber.images.length > 0 ? (
              <ImageCarousel
                images={climber.images}
                userId={climber.id}
                expandable={true}
                height={width * 0.8}
                darkMode={darkMode}
                showIndicators={true}
                style={{ width: '100%' }}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.placeholderText}>No images available</Text>
              </View>
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.name}>
              {climber.name}, {climber.age}
            </Text>
            <Text style={styles.grade}>
              {formatGradeDisplay(climber.grade)} climber
            </Text>
            <Text style={styles.gym}>
              🏔️ {climber.home_gym}
            </Text>
            {distance !== null && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={16} color={theme.colors.accent} />
                <Text style={styles.distanceText}>{formatDistance(distance)} away</Text>
              </View>
            )}

            {/* Climbing Styles */}
            <View style={styles.stylesContainer}>
              <Text style={styles.sectionTitle}>Climbing Styles</Text>
              <View style={styles.stylesList}>
                {climber.climbing_styles.map((style: string, index: number) => (
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
            <Ionicons name="chatbubble" size={20} color={theme.colors.text} />
            <Text style={styles.messageButtonText}>Message</Text>
          </Pressable>

          <Pressable style={styles.moreButton} onPress={() => setShowBlockReportMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#a1a1aa" />
          </Pressable>
        </View>
      </View>

      <BlockReportMenu
        visible={showBlockReportMenu}
        userId={climber.id}
        userName={climber.name}
        onClose={() => setShowBlockReportMenu(false)}
        onBlock={() => {
          // Handle block action - you might want to close the modal or refresh data
          setShowBlockReportMenu(false);
          onClose(); // Close the match detail modal as well
        }}
        onUnmatch={onUnmatch ? handleUnmatch : undefined}
        darkMode={darkMode}
      />
    </Modal>
  );
};

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
      backgroundColor: "transparent"
    },
    closeButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
    },
    imageContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      backgroundColor: "transparent",
      width: '100%',
      minHeight: width * 0.8,
    },
    placeholderImage: {
      width: width * 0.8,
      height: width * 0.8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    infoContainer: {
      paddingHorizontal: 24,
      paddingBottom: 100,
      backgroundColor: "transparent"
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    grade: {
      fontSize: 18,
      color: theme.colors.accent,
      textAlign: 'center',
      marginBottom: 16,
    },
    gym: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: "transparent",
      justifyContent: 'center',
      gap: 6,
      marginBottom: 24,
    },
    distanceText: {
      fontSize: 14,
      color: theme.colors.accent,
      fontWeight: '500',
    },
    stylesContainer: {
      marginBottom: 24,
      backgroundColor: "transparent"
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    stylesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      backgroundColor: "transparent"
    },
    styleChip: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    styleText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: '500',
    },
    bioContainer: {
      marginBottom: 24,
      backgroundColor: "transparent"
    },
    bio: {
      fontSize: 16,
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    messageButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      paddingVertical: 16,
      borderRadius: 12,
      marginRight: 12,
      gap: 8,
    },
    messageButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    moreButton: {
      width: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: 16,
      borderRadius: 12,
    },
  });