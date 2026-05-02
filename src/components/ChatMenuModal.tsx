import { Text } from '@/components/Themed';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatMenuModalProps {
  visible: boolean;
  climberName: string;
  onClose: () => void;
  onDeleteChat: () => void;
  darkMode: boolean;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
  visible,
  climberName,
  onClose,
  onDeleteChat,
  darkMode,
}) => {
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const handleDelete = () => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete this chat with ${climberName}?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            onDeleteChat();
            onClose();
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menuContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Text style={styles.menuTitle}>Options</Text>

          <Pressable
            style={styles.menuItem}
            onPress={handleDelete}
          >
            <Ionicons
              name="trash"
              size={20}
              color="#ef4444"
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>
              Delete Chat
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
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 8,
    },
    menuIcon: {
      marginRight: 12,
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
  });
