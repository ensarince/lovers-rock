import { Text } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { getReportService } from '@/src/services/reportService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BlockReportMenuProps {
  visible: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onBlock?: () => void;
  onUnmatch?: () => void;
  darkMode: boolean;
}

export const BlockReportMenu: React.FC<BlockReportMenuProps> = ({
  visible,
  userId,
  userName,
  onClose,
  onBlock,
  onUnmatch,
  darkMode,
}) => {
  const { user, token, setUser } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleBlock = async () => {
    if (!user?.id || !token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    try {
      const reportService = getReportService();
      const updatedUserData = await reportService.blockUser(user.id, userId, token);
      // Update user context with new blocked_users list
      if (updatedUserData) {
        console.log('✅ Block successful! Updated blocked_users:', updatedUserData.blocked_users);
        const updatedUser: any = { ...user, blocked_users: updatedUserData.blocked_users || [] };
        setUser(updatedUser);
      }
      Alert.alert('Success', `${userName} has been blocked`);
      onBlock?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Block failed:', error);
      Alert.alert('Error', error.message || 'Failed to block user');
    }
  };

  const handleReportSubmit = async () => {
    if (!user?.id || !token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    if (!reportReason) {
      Alert.alert('Required', 'Please select a reason for the report');
      return;
    }

    setSubmitting(true);
    try {
      const reportService = getReportService();
      await reportService.reportUser(
        user.id,
        userId,
        reportReason as any,
        reportDescription,
        token
      );
      setShowSuccessModal(true);
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.menuContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Text style={styles.menuTitle}>Actions for {userName}</Text>

            {onUnmatch && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  onUnmatch();
                  onClose();
                }}
              >
                <Ionicons
                  name="heart-dislike"
                  size={20}
                  color="#f59e0b"
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>
                  Unmatch
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowReportDialog(true);
              }}
            >
              <Ionicons
                name="flag"
                size={20}
                color={theme.colors.accent}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>Report User</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleBlock}>
              <Ionicons
                name="ban"
                size={20}
                color="#ef4444"
                style={styles.menuIcon}
              />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>
                Block User
              </Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={onClose}>
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Report Dialog */}
      <Modal
        visible={showReportDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReportDialog(false)}
      >
        <Pressable
          style={styles.reportOverlay}
          onPress={() => setShowReportDialog(false)}
        >
          <View style={styles.reportDialog}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report {userName}</Text>
              <Pressable onPress={() => setShowReportDialog(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            <ScrollView style={styles.reportContent}>
              <Text style={styles.reportLabel}>Reason for Report *</Text>
              <View style={styles.reasonGrid}>
                {['harassment', 'inappropriate_photos', 'spam', 'fake_profile', 'other'].map(
                  (reason) => (
                    <Pressable
                      key={reason}
                      style={[
                        styles.reasonButton,
                        reportReason === reason && styles.reasonButtonActive,
                      ]}
                      onPress={() => setReportReason(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonButtonText,
                          reportReason === reason && styles.reasonButtonTextActive,
                        ]}
                      >
                        {reason === 'inappropriate_photos'
                          ? 'Inappropriate Photos'
                          : reason === 'fake_profile'
                          ? 'Fake Profile'
                          : reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Text style={[styles.reportLabel, { marginTop: 16 }]}>
                Additional Details
              </Text>
              <TextInput
                style={styles.reportInput}
                placeholder="Provide more information to help us understand the issue..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={reportDescription}
                onChangeText={setReportDescription}
              />
            </ScrollView>

            <View style={styles.reportFooter}>
              <Pressable
                style={styles.reportCancelButton}
                onPress={() => setShowReportDialog(false)}
              >
                <Text style={styles.reportCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.reportSubmitButton,
                  !reportReason && styles.reportSubmitButtonDisabled,
                ]}
                onPress={handleReportSubmit}
                disabled={submitting || !reportReason}
              >
                <Text style={styles.reportSubmitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
      >
        <Pressable
          style={styles.successOverlay}
          onPress={() => {
            setShowSuccessModal(false);
            onClose();
          }}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={72}
                color={theme.colors.success}
              />
            </View>

            <Text style={styles.successTitle}>Report Submitted</Text>

            <Text style={styles.successMessage}>
              Thank you for reporting this user. Our team will review your report and take appropriate action if needed.
            </Text>

            <Text style={styles.successSubtext}>
              The safety of our community is important to us.
            </Text>

            <Pressable
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                onClose();
              }}
            >
              <Text style={styles.successButtonText}>Got It</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    menuTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    menuIcon: {
      marginRight: 12,
    },
    menuItemText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    reportOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    reportDialog: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      maxHeight: '80%',
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    reportTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    reportContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    reportLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    reasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    reasonButton: {
      flex: 1,
      minWidth: '45%',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    reasonButtonActive: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
    },
    reasonButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    reasonButtonTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    reportInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    reportFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    reportCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    reportCancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    reportSubmitButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#ef4444',
      alignItems: 'center',
    },
    reportSubmitButtonDisabled: {
      opacity: 0.5,
    },
    reportSubmitButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    successOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    successContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    successIconContainer: {
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    successMessage: {
      fontSize: 15,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 22,
    },
    successSubtext: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '500',
    },
    successButton: {
      backgroundColor: theme.colors.success,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
    },
    successButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
