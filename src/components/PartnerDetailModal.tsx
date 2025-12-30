import { theme } from '@/src/theme';
import { Climber } from '@/src/types/climber';
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface PartnerDetailModalProps {
  visible: boolean;
  climber: Climber | null;
  onClose: () => void;
  onSendRequest: (climber: Climber) => void;
  requestSent?: boolean;
}

export default function PartnerDetailModal({ visible, climber, onClose, onSendRequest, requestSent }: PartnerDetailModalProps) {
  // Always render the modal, but show empty content if no climber
  const getImageUrl = () => {
    if (climber && climber.avatar && climber.id) {
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      return `${baseUrl}/api/files/users/${climber.id}/${climber.avatar}?thumb=400x400`;
    }
    return undefined;
  };
  React.useEffect(() => {
  }, [visible, climber, requestSent]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {climber ? (
            <>
              {getImageUrl() ? (
                <Image source={{ uri: getImageUrl() }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' }]}> 
                  <Text style={{ color: '#fff', fontSize: 32 }}>?</Text>
                </View>
              )}
              <Text style={styles.title}>{climber.name}</Text>
              <Text style={styles.detail}>Gym: {climber.home_gym}</Text>
              <Text style={styles.detail}>Grade: {climber.grade}</Text>
              <Text style={styles.detail}>Styles: {Array.isArray(climber.climbing_styles) ? climber.climbing_styles.join(', ') : ''}</Text>
              <Text style={styles.detail}>Bio: {climber.bio}</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.requestButton, requestSent && styles.requestButtonSent]}
                onPress={() => {
                  onSendRequest(climber);
                }}
                disabled={requestSent}
              >
                <Text style={styles.requestButtonText}>{requestSent ? 'Request Sent' : 'Send Partner Request'}</Text>
              </Pressable>
            </>
          ) : (
            <View />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
