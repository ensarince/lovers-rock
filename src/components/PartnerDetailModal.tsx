import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { useAuth } from '@/src/context/AuthContext';
import { calculateDistance, formatDistance } from '@/src/services/geoService';
import { formatGradeDisplay } from '@/src/services/gradeService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PartnerDetailModalProps {
  visible: boolean;
  climber: Climber | null;
  onClose: () => void;
  onSendRequest: (climber: Climber, isRemoving?: boolean) => void;
  onBlock?: () => void;
  userLatitude?: number;
  userLongitude?: number;
}

export default function PartnerDetailModal({ visible, climber, onClose, onSendRequest, onBlock, userLatitude, userLongitude }: PartnerDetailModalProps) {
  const { darkMode, user } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const [isRequestSent, setIsRequestSent] = React.useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);

  // Calculate distance when climber or user location changes
  useEffect(() => {
    if (userLatitude && userLongitude && climber?.latitude && climber?.longitude) {
      const dist = calculateDistance(
        userLatitude,
        userLongitude,
        climber.latitude,
        climber.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [userLatitude, userLongitude, climber?.latitude, climber?.longitude]);

  // Check if climber is in liked_users_partner when climber changes
  React.useEffect(() => {
    if (climber && user) {
      // Check the new liked_users_partner field
      const likedUsersPartner = user.liked_users_partner || [];
      const isLiked = Array.isArray(likedUsersPartner) ? likedUsersPartner.includes(climber.id) : false;
      setIsRequestSent(isLiked);
    } else {
      setIsRequestSent(false);
    }
  }, [climber, user]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {climber ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <ImageCarousel
                images={climber.images || []}
                userId={climber.id}
                expandable={true}
                height={250}
                darkMode={darkMode}
                showIndicators={true}
              />
              <Text style={styles.title}>{climber.name}</Text>
              <Pressable 
                onPress={() => setShowBlockReportMenu(true)}
                style={styles.menuButton}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.textSecondary} />
              </Pressable>
              <Text style={styles.detail}>Gym: {climber.home_gym}</Text>
              {distance !== null && (
                <View style={styles.distanceRow}>
                  <Ionicons name="location" size={14} color={theme.colors.accent} />
                  <Text style={styles.distanceDetail}>{formatDistance(distance)} away</Text>
                </View>
              )}
              <Text style={styles.detail}>Grade: {formatGradeDisplay(climber.grade)}</Text>
              <Text style={styles.detail}>Styles: {Array.isArray(climber.climbing_styles) ? climber.climbing_styles.join(', ') : ''}</Text>
              <Text style={styles.detail}>Bio: {climber.bio}</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.requestButton, isRequestSent && styles.requestButtonSent]}
                onPress={async () => {
                  onSendRequest(climber, isRequestSent);
                  // Immediately toggle the button state for instant feedback
                  setIsRequestSent(!isRequestSent);
                }}
              >
                <Text style={styles.requestButtonText}>{isRequestSent ? 'Request Sent' : 'Send Partner Request'}</Text>
              </Pressable>

              <BlockReportMenu
                visible={showBlockReportMenu}
                userId={climber.id}
                userName={climber.name}
                onClose={() => setShowBlockReportMenu(false)}
                onBlock={() => {
                  onBlock?.();
                  onClose();
                }}
                darkMode={darkMode}
              />
            </ScrollView>
          ) : (
            <View />
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '85%',
      alignItems: 'center',
      position: 'relative',
    },
    menuButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 8,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 20,
      zIndex: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.text,
    },
    detail: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    distanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    distanceDetail: {
      fontSize: 15,
      color: theme.colors.accent,
      fontWeight: '500',
    },
    closeButton: {
      marginTop: 18,
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    closeButtonText: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 16,
      backgroundColor: '#eee',
    },
    requestButton: {
      marginTop: 12,
      backgroundColor: theme.colors.accent,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 22,
    },
    requestButtonSent: {
      backgroundColor: theme.colors.success,
    },
    requestButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
  });
