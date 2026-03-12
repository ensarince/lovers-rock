import { Text, View } from '@/components/Themed';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { messageService } from '@/src/services/messageService';
import { getReportService } from '@/src/services/reportService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Match } from '@/src/types/match';
import { Message } from '@/src/types/message';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
} from 'react-native';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const { user, token, darkMode } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [climberData, setClimberData] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const { matchId, climberName, climberId, climberAvatar, climberData: climberDataStr } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  // Parse climber data from route params
  useEffect(() => {
    if (climberDataStr) {
      try {
        const parsed = JSON.parse(climberDataStr as string);
        setClimberData(parsed);
      } catch (error) {
        console.error('Failed to parse climber data:', error);
      }
    }
  }, [climberDataStr]);

  // Check blocked status and load messages on mount
  useEffect(() => {
    const checkBlocked = async () => {
      if (!user?.id || !climberId || !token) return;
      const reportService = getReportService();
      const [iBlocked, theyBlocked] = await Promise.all([
        reportService.isUserBlocked(user.id, climberId as string, token),
        reportService.isUserBlocked(climberId as string, user.id, token),
      ]);
      setBlocked(iBlocked || theyBlocked);
    };

    if (token) {
      messageService.setToken(token);
    }
    if (user?.id && climberId) {
      checkBlocked();
      loadMessages();
    }
  }, [user?.id, climberId, token]);

  // Fetch full climber data only if needed for details not in route params
  useEffect(() => {
    const fetchFullClimberData = async () => {
      if (!climberId || !token || climberData?.bio) return; // Already have data
      try {
        const res = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${climberId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setClimberData(data);
        }
      } catch (error) {
        console.error('Failed to fetch climber data:', error);
      }
    };

    if (detailModalVisible && climberData && !climberData.bio) {
      fetchFullClimberData();
    }
  }, [detailModalVisible, climberData, climberId, token]);

  const loadMessages = async () => {
    if (!user?.id || !climberId) return;

    try {
      setLoading(true);
      const msgs = await messageService.getMessagesBetweenUsers(user.id, climberId as string);
      setMessages(msgs.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()));

      // Mark messages from the other user as read
      await messageService.markMessagesAsRead(climberId as string, user.id);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMessages();
    } finally {
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !climberId || sending || blocked) return;

    try {
      setSending(true);
      // Double-check block before sending
      if (!user?.id || !token) {
        setSending(false);
        return;
      }
      const reportService = getReportService();
      const [iBlocked, theyBlocked] = await Promise.all([
        reportService.isUserBlocked(user.id, climberId as string, token),
        reportService.isUserBlocked(climberId as string, user.id, token),
      ]);
      if (iBlocked || theyBlocked) {
        setBlocked(true);
        setSending(false);
        return;
      }
      await messageService.sendMessage(user.id, climberId as string, newMessage);
      setNewMessage('');
      await loadMessages(); // Reload messages to show the new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.timestamp, isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp]}>
          {new Date(item.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const goBack = () => {
    router.back();
  };


  if (blocked) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.colors.error, textAlign: 'center', marginTop: 32 }}>
          You cannot message this user.
        </Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerContentContainer}>
          {climberAvatar && (
            <Pressable onPress={() => setDetailModalVisible(true)} style={styles.headerAvatarButton}>
              <Image
                source={{
                  uri: climberAvatar as string,
                }}
                style={styles.headerAvatar}
              />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{climberName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#a1a1aa"
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Detail Modal */}
      <MatchDetailModal
        visible={detailModalVisible}
        match={{
          id: (climberId as string) || '',
          climber: climberData && Object.keys(climberData).length > 0 ? climberData : {
            id: (climberId as string) || '',
            name: (climberName as string) || '',
            age: 0,
            images: [],
            climbing_styles: [],
            grade: null,
            bio: '',
            home_gym: '',
            email: '',
          },
          matchedAt: 0,
          unreadCount: 0,
        } as Match}
        onClose={() => setDetailModalVisible(false)}
        onMessage={() => {}}
        userLatitude={user?.latitude}
        userLongitude={user?.longitude}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerContentContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      gap: 12,
    },
    headerAvatarButton: {
      padding: 4,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      paddingBottom: 20,
    },
    messageContainer: {
      marginBottom: 12,
      maxWidth: '80%',
      backgroundColor: 'transparent',
    },
    ownMessage: {
      alignSelf: 'flex-end',
    },
    otherMessage: {
      alignSelf: 'flex-start',
    },
    messageText: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
      fontSize: 16,
      lineHeight: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    ownMessageText: {
      backgroundColor: theme.colors.accent,
      color: theme.colors.text,
    },
    otherMessageText: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    timestamp: {
      fontSize: 10,
      marginTop: 4,
    },
    ownTimestamp: {
      color: theme.colors.textSecondary,
      textAlign: 'right',
    },
    otherTimestamp: {
      color: theme.colors.textSecondary,
      textAlign: 'left',
    },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 54,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 16,
      maxHeight: 100,
      marginRight: 12,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: '#374151',
    },
  });