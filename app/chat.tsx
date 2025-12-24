import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { messageService } from '@/src/services/messageService';
import { Message } from '@/src/types/message';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
} from 'react-native';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const { user, token } = useAuth();
  const { matchId, climberName, climberId } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (token) {
      messageService.setToken(token);
    }
    if (user?.id && climberId) {
      loadMessages();
      // TODO: Implement real-time updates when EventSource is available in React Native
      // For now, we'll rely on manual refresh when entering the screen
    }
  }, [user?.id, climberId, token]);

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
      console.error('Failed to load messages:', error);
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
    if (!newMessage.trim() || !user?.id || !climberId || sending) return;

    try {
      setSending(true);
      await messageService.sendMessage(user.id, climberId as string, newMessage);
      setNewMessage('');
      await loadMessages(); // Reload messages to show the new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>{climberName}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#101014',
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
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
  },
  ownMessageText: {
    backgroundColor: '#ec4899',
    color: '#ffffff',
  },
  otherMessageText: {
    backgroundColor: '#23232a',
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTimestamp: {
    color: '#a1a1aa',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#a1a1aa',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 54,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#23232a',
  },
  input: {
    flex: 1,
    backgroundColor: '#23232a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#ec4899',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
  },
});