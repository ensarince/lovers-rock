import { BlockReportMenu } from '@/src/components/BlockReportMenu';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { useAuth } from '@/src/context/AuthContext';
import { formatDistance } from '@/src/services/geoService';
import { formatGradeDisplay } from '@/src/services/gradeService';
import { getOutgoingLikes } from '@/src/services/socialGraphService';
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
  viewOnly?: boolean;
}

export default function PartnerDetailModal({ visible, climber, onClose, onSendRequest, onBlock, userLatitude, userLongitude, viewOnly = false }: PartnerDetailModalProps) {
  const { darkMode, user, token } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const [isRequestSent, setIsRequestSent] = React.useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);

  // Use server-computed distance from /api/nearby-profiles (no raw coords needed)
  useEffect(() => {
    if (climber?.distance_km !== null && climber?.distance_km !== undefined) {
      setDistance(climber.distance_km);
    } else {
      setDistance(null);
    }
  }, [climber?.distance_km]);

  // Check if climber is in outgoing partner likes
  React.useEffect(() => {
    let active = true;

    const checkLike = async () => {
      if (!climber || !user?.id || !token) {
        setIsRequestSent(false);
        return;
      }

      try {
        const likes = await getOutgoingLikes(user.id, token, 'partner');
        const isLiked = likes.some((like) => like.to_user === climber.id);
        if (active) {
          setIsRequestSent(isLiked);
        }
      } catch {
        if (active) {
          setIsRequestSent(false);
        }
      }
    };

    checkLike();

    return () => {
      active = false;
    };
  }, [climber, user?.id, token]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {climber ? (
            <>
              <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>{climber.name}</Text>
                <Pressable onPress={onClose} style={styles.closeButtonTop}>
                  <Ionicons name="close" size={28} color={theme.colors.accent} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <ImageCarousel
                  images={climber.images || []}
                  userId={climber.id}
                  expandable={true}
                  height={250}
                  darkMode={darkMode}
                  showIndicators={true}
                />
                <View style={styles.headerSection}></View>

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

              {!viewOnly && (
                <View style={styles.buttonSection}>
                  <Pressable
                    style={[styles.requestButton, isRequestSent && styles.requestButtonSent]}
                    onPress={async () => {
                      onSendRequest(climber, isRequestSent);
                      // Immediately toggle the button state for instant feedback
                      setIsRequestSent(!isRequestSent);
                    }}
                  >
                    <Text style={styles.requestButtonText}>{isRequestSent ? 'Request Sent' : 'Send Climbing Partner Request'}</Text>
                  </Pressable>
                </View>
              )}

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
            </>
          ) : (
            <View />
          )}
        </Pressable>
      </Pressable>
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    topBarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    closeButtonTop: {
      padding: 8,
      marginRight: -8,
    },
    headerSection: {
      display: 'none',
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
