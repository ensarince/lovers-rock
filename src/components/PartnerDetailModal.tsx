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
              <View style={styles.headerSection}>
                <Text style={styles.title}>{climber.name}</Text>
                <Pressable 
                  onPress={() => setShowBlockReportMenu(true)}
                  style={styles.menuButton}>
                  <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-sharp" size={16} color={theme.colors.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Home Gym</Text>
                    <Text style={styles.infoValue}>{climber.home_gym}</Text>
                  </View>
                </View>

                {distance !== null && (
                  <View style={styles.infoRow}>
                    <Ionicons name="compass" size={16} color={theme.colors.accent} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Distance</Text>
                      <Text style={styles.infoValue}>{formatDistance(distance)} away</Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Ionicons name="trophy" size={16} color={theme.colors.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Grade Level</Text>
                    <Text style={styles.infoValue}>{formatGradeDisplay(climber.grade)}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="play" size={16} color={theme.colors.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Climbing Styles</Text>
                    <Text style={styles.infoValue}>{Array.isArray(climber.climbing_styles) ? climber.climbing_styles.join(', ') : 'Not specified'}</Text>
                  </View>
                </View>
              </View>

              {climber.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.bioLabel}>About</Text>
                  <Text style={styles.bioText}>{climber.bio}</Text>
                </View>
              )}

              <View style={styles.buttonSection}>
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

                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>

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
      padding: 0,
      width: '85%',
      maxHeight: '90%',
      overflow: 'hidden',
    },
    menuButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      padding: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 20,
      zIndex: 10,
    },
    headerSection: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      position: 'relative',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    infoSection: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 10,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    infoContent: {
      flex: 1,
      gap: 1,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    bioSection: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    bioLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 6,
    },
    bioText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    buttonSection: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    closeButton: {
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 15,
      textAlign: 'center',
    },
    requestButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestButtonSent: {
      backgroundColor: theme.colors.success,
    },
    requestButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      textAlign: 'center',
    },
  });
