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
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [isRequestSent, setIsRequestSent] = React.useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBlockReportMenu, setShowBlockReportMenu] = useState(false);

  useEffect(() => {
    if (climber?.distance_km !== null && climber?.distance_km !== undefined) {
      setDistance(climber.distance_km);
    } else {
      setDistance(null);
    }
  }, [climber?.distance_km]);

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
        if (active) setIsRequestSent(isLiked);
      } catch {
        if (active) setIsRequestSent(false);
      }
    };

    checkLike();
    return () => { active = false; };
  }, [climber, user?.id, token]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {climber ? (
            <>
              {/* Image hero with gradient + name overlay */}
              <View style={styles.imageSection}>
                <ImageCarousel
                  images={climber.images || []}
                  userId={climber.id}
                  expandable={true}
                  height={300}
                  darkMode={darkMode}
                  showIndicators={true}
                />
                <View style={styles.imageGradientWrap} pointerEvents="none">
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
                <View style={styles.imageTextOverlay} pointerEvents="none">
                  <View style={styles.imageNameRow}>
                    <Text style={styles.overlayName}>{climber.name}, {climber.age}</Text>
                    {climber.grade?.value && (
                      <View style={styles.overlayGradePill}>
                        <Text style={styles.overlayGradeText}>{climber.grade.value}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable onPress={onClose} style={styles.floatingClose}>
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Info grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoGridItem}>
                    <Ionicons name="location-sharp" size={15} color={theme.colors.accent} />
                    <Text style={styles.infoGridLabel}>Home Gym</Text>
                    <Text style={styles.infoGridValue} numberOfLines={2}>{climber.home_gym}</Text>
                  </View>

                  <View style={styles.infoGridItem}>
                    <Ionicons name="trophy" size={15} color={theme.colors.accent} />
                    <Text style={styles.infoGridLabel}>Grade</Text>
                    <Text style={styles.infoGridValue}>{formatGradeDisplay(climber.grade)}</Text>
                  </View>

                  {distance !== null && (
                    <View style={styles.infoGridItem}>
                      <Ionicons name="compass" size={15} color={theme.colors.accent} />
                      <Text style={styles.infoGridLabel}>Distance</Text>
                      <Text style={styles.infoGridValue}>{formatDistance(distance)} away</Text>
                    </View>
                  )}

                  <View style={styles.infoGridItem}>
                    <Ionicons name="layers" size={15} color={theme.colors.accent} />
                    <Text style={styles.infoGridLabel}>Styles</Text>
                    <Text style={styles.infoGridValue} numberOfLines={3}>
                      {Array.isArray(climber.climbing_styles) ? climber.climbing_styles.join(' · ') : 'Not specified'}
                    </Text>
                  </View>
                </View>

                {climber.bio && (
                  <View style={styles.bioSection}>
                    <Text style={styles.bioLabel}>About</Text>
                    <Text style={styles.bioText}>{climber.bio}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Fixed footer — always visible, above system nav bar */}
              {!viewOnly && (
                <View style={[styles.buttonSection, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
                  <Pressable
                    style={[styles.requestButton, isRequestSent && styles.requestButtonSent]}
                    onPress={async () => {
                      onSendRequest(climber, isRequestSent);
                      setIsRequestSent(!isRequestSent);
                    }}
                  >
                    <Ionicons
                      name={isRequestSent ? 'checkmark-circle' : 'people'}
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.requestButtonText}>
                      {isRequestSent ? 'Request Sent' : 'Send Climbing Partner Request'}
                    </Text>
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
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      maxHeight: '90%',
    },
    imageSection: {
      position: 'relative',
      overflow: 'hidden',
    },
    imageGradientWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 110,
    },
    imageTextOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 18,
      right: 18,
    },
    imageNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    overlayName: {
      fontSize: 24,
      fontWeight: '800',
      color: '#fff',
      flex: 1,
      letterSpacing: -0.3,
    },
    overlayGradePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(52,211,207,0.90)',
    },
    overlayGradeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.3,
    },
    floatingClose: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 10,
    },
    infoGridItem: {
      flex: 1,
      minWidth: '42%',
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      padding: 13,
      gap: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoGridLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 5,
    },
    infoGridValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      lineHeight: 20,
    },
    bioSection: {
      marginHorizontal: 14,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    bioLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    bioText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 21,
    },
    buttonSection: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 28,
    },
    requestButton: {
      backgroundColor: '#34D3CF',
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      shadowColor: '#34D3CF',
      shadowOpacity: 0.38,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    requestButtonSent: {
      backgroundColor: theme.colors.success,
      shadowColor: theme.colors.success,
    },
    requestButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      textAlign: 'center',
    },
  });
