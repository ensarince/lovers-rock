import { ChatMenuModal } from '@/src/components/ChatMenuModal';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { messageService } from '@/src/services/messageService';
import { getReportService } from '@/src/services/reportService';
import { typingService } from '@/src/services/typingService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Match } from '@/src/types/match';
import { Message } from '@/src/types/message';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const POCKETBASE_URL = getPocketBaseUrl();
const HEART_REACTION = '\u2764\uFE0F';
const LEGACY_HEART_REACTION = '\u00e2\u009d\u00a4\u00ef\u00b8\u008f';

const sortMessages = (msgs: Message[]) =>
  [...msgs].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

const messagesAreEqual = (prev: Message[], next: Message[]) => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  return prev.every((message, index) => {
    const nextMessage = next[index];
    if (!nextMessage) return false;

    const prevReactions = message.reactions || {};
    const nextReactions = nextMessage.reactions || {};
    const prevReactionKeys = Object.keys(prevReactions);
    const nextReactionKeys = Object.keys(nextReactions);

    if (prevReactionKeys.length !== nextReactionKeys.length) return false;
    if (prevReactionKeys.some((key) => prevReactions[key] !== nextReactions[key])) return false;

    return (
      message.id === nextMessage.id &&
      message.content === nextMessage.content &&
      message.created === nextMessage.created &&
      message.read === nextMessage.read &&
      message.sender_id === nextMessage.sender_id &&
      message.receiver_id === nextMessage.receiver_id
    );
  });
};

const upsertMessage = (messages: Message[], nextMessage: Message) => {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return sortMessages([...messages, nextMessage]);
  }

  const nextMessages = [...messages];
  nextMessages[existingIndex] = nextMessage;
  return sortMessages(nextMessages);
};

const isHeartReaction = (reaction?: string) =>
  reaction === HEART_REACTION || reaction === LEGACY_HEART_REACTION;

const getHeartReactionCount = (message: Message) =>
  Object.values(message.reactions || {}).filter((reaction) => isHeartReaction(reaction)).length;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const { user, token, darkMode } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [climberData, setClimberData] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reactingToMessageIds, setReactingToMessageIds] = useState<string[]>([]);
  const theme = darkMode ? themeDark : themeLight;
  const styles = darkMode ? darkStyles : lightStyles;
  const { climberName, climberId, climberAvatar, climberData: climberDataStr } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const fallbackPollingIntervalRef = useRef<number | null>(null);
  const conversationUnsubscribeRef = useRef<null | (() => Promise<void>)>(null);
  const typingUnsubscribeRef = useRef<null | (() => Promise<void>)>(null);
  const typingExpireTimeoutRef = useRef<number | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const updateMessages = (nextMessages: Message[]) => {
    const sortedMessages = sortMessages(nextMessages);
    setMessages((prev) => (messagesAreEqual(prev, sortedMessages) ? prev : sortedMessages));
  };

  const applyMessageUpdate = (nextMessage: Message) => {
    setMessages((prev) => {
      const nextMessages = upsertMessage(prev, nextMessage);
      return messagesAreEqual(prev, nextMessages) ? prev : nextMessages;
    });
  };

  const setReactionForMessage = (messageId: string, reaction: string | null, reactingUserId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const nextReactions = { ...(message.reactions || {}) };

        if (reaction) {
          nextReactions[reactingUserId] = reaction;
        } else {
          delete nextReactions[reactingUserId];
        }

        return {
          ...message,
          reactions: nextReactions,
        };
      })
    );
  };

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
      typingService.setToken(token);
    }
    if (user?.id && climberId) {
      checkBlocked();
      loadMessages();
    }
  }, [user?.id, climberId, token]);

  useEffect(() => {
    if (!user?.id || !climberId) return;

    let isActive = true;

    const clearTypingTimeout = () => {
      if (typingExpireTimeoutRef.current) {
        clearTimeout(typingExpireTimeoutRef.current);
        typingExpireTimeoutRef.current = null;
      }
    };

    const handleTypingRecord = (record: { is_typing: boolean; expires_at?: string | null }) => {
      if (!isActive) return;

      const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
      const now = Date.now();
      const shouldShowTyping = record.is_typing && expiresAt > now;

      setIsPartnerTyping(shouldShowTyping);
      clearTypingTimeout();

      if (shouldShowTyping) {
        typingExpireTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, Math.max(0, expiresAt - now));
      }
    };

    const subscribeToTyping = async () => {
      try {
        typingUnsubscribeRef.current = await typingService.subscribeToTyping(
          climberId as string,
          user.id,
          handleTypingRecord
        );
      } catch (error) {
        if (process.env.EXPO_DEV_MODE) console.error('Failed to subscribe to typing status:', error);
      }
    };

    subscribeToTyping();

    return () => {
      isActive = false;
      clearTypingTimeout();
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current().catch((error) => {
          if (process.env.EXPO_DEV_MODE) console.error('Failed to unsubscribe from typing status:', error);
        });
        typingUnsubscribeRef.current = null;
      }
    };
  }, [user?.id, climberId]);

  useEffect(() => {
    if (!isPartnerTyping) {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      return;
    }

    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(450 - delay),
        ])
      );

    const anim = Animated.parallel([
      bounce(dot1, 0),
      bounce(dot2, 150),
      bounce(dot3, 300),
    ]);
    anim.start();
    return () => anim.stop();
  }, [isPartnerTyping]);

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

  // Realtime conversation updates, with slower polling as a fallback.
  useEffect(() => {
    let isActive = true;

    const clearFallbackPolling = () => {
      if (fallbackPollingIntervalRef.current) {
        clearInterval(fallbackPollingIntervalRef.current);
        fallbackPollingIntervalRef.current = null;
      }
    };

    const startFallbackPolling = () => {
      if (fallbackPollingIntervalRef.current || !user?.id || !climberId) return;

      fallbackPollingIntervalRef.current = setInterval(async () => {
        try {
          const msgs = await messageService.getMessagesBetweenUsers(user.id, climberId as string);
          updateMessages(msgs);
        } catch (error) {
          if (process.env.EXPO_DEV_MODE) console.error('Fallback polling error:', error);
        }
      }, 10000);
    };

    const setupConversationSubscription = async () => {
      if (!user?.id || !climberId) return;

      clearFallbackPolling();

      try {
        conversationUnsubscribeRef.current = await messageService.subscribeToConversation(
          user.id,
          climberId as string,
          async ({ action, message }) => {
            if (!isActive) return;

            if (action === 'delete') {
              setMessages((prev) => prev.filter((existingMessage) => existingMessage.id !== message.id));
              return;
            }

            const nextMessage =
              action === 'create' && message.sender_id !== user.id
                ? { ...message, read: true }
                : message;

            applyMessageUpdate(nextMessage);

            if (action === 'create' && message.sender_id !== user.id) {
              try {
                await messageService.markMessagesAsRead(climberId as string, user.id);
              } catch (error) {
                if (process.env.EXPO_DEV_MODE) console.error('Failed to mark realtime message as read:', error);
              }
            }

            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: action === 'create' });
            }, 50);
          }
        );
      } catch (error) {
        if (process.env.EXPO_DEV_MODE) console.error('Realtime subscription failed, using fallback polling:', error);
        startFallbackPolling();
      }
    };

    setupConversationSubscription();

    return () => {
      isActive = false;
      clearFallbackPolling();
      if (conversationUnsubscribeRef.current) {
        conversationUnsubscribeRef.current().catch((error) => {
          if (process.env.EXPO_DEV_MODE) console.error('Failed to unsubscribe from conversation:', error);
        });
        conversationUnsubscribeRef.current = null;
      }
    };
  }, [user?.id, climberId]);

  const loadMessages = async () => {
    if (!user?.id || !climberId) return;

    try {
      setLoading(true);
      const msgs = await messageService.getMessagesBetweenUsers(user.id, climberId as string);
      updateMessages(msgs);

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
      const sentMessage = await messageService.sendMessage(user.id, climberId as string, newMessage);
      setNewMessage('');
      applyMessageUpdate(sentMessage);
      typingService.setTyping(user.id, climberId as string, false).catch((error) => {
        if (process.env.EXPO_DEV_MODE) console.error('Failed to clear typing status after send:', error);
      });
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
    const userReaction = item.reactions ? item.reactions[user?.id || ''] : undefined;
    const isReacting = reactingToMessageIds.includes(item.id);
    const likedByCurrentUser = isHeartReaction(userReaction);
    const heartReactionCount = getHeartReactionCount(item);
    const showReactionBadge = heartReactionCount > 0;
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={styles.messageContent}>
        <Pressable style={styles.messageBubble}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp]}>
              {new Date(item.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isOwnMessage && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={12}
                color={item.read ? theme.colors.accent : theme.colors.textSecondary}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </Pressable>
        {showReactionBadge && (
          <View style={[styles.reactionBadge, isOwnMessage ? styles.ownReactionBadge : styles.otherReactionBadge]}>
            <Text style={styles.reactionBadgeText}>
              {HEART_REACTION}
              {heartReactionCount > 1 ? ` ${heartReactionCount}` : ''}
            </Text>
          </View>
        )}
        </View>
        {!isOwnMessage && (
          <Pressable
            style={[styles.likeButton, isReacting && styles.likeButtonDisabled]}
            onPress={() => handleToggleLike(item.id)}
            disabled={isReacting}
          >
            <Ionicons
              name={likedByCurrentUser ? "heart" : "heart-outline"}
              size={14}
              color={likedByCurrentUser ? '#ef4444' : theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    );
  };
  const handleToggleLike = async (messageId: string) => {
    if (!user?.id || !token) return;
    const message = messages.find((currentMessage) => currentMessage.id === messageId);
    if (!message) return;
    const previousReaction = message.reactions?.[user.id];
    const nextReaction = isHeartReaction(previousReaction) ? null : HEART_REACTION;
    try {
      setReactingToMessageIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
      setReactionForMessage(messageId, nextReaction, user.id);
      await messageService.updateMessageReaction(messageId, user.id, nextReaction);
    } catch (error) {
      setReactionForMessage(messageId, previousReaction || null, user.id);
      if (process.env.EXPO_DEV_MODE) console.error('Failed to update reaction:', error);
    } finally {
      setReactingToMessageIds((prev) => prev.filter((id) => id !== messageId));
    }
  };

  const handleInputChange = (text: string) => {
    setNewMessage(text);

    if (!user?.id || !climberId) return;

    const trimmed = text.trim();
    const now = Date.now();

    if (trimmed.length === 0) {
      typingService.setTyping(user.id, climberId as string, false).catch((error) => {
        if (process.env.EXPO_DEV_MODE) console.error('Failed to clear typing status:', error);
      });
      return;
    }

    if (now - lastTypingSentAtRef.current > 1500) {
      lastTypingSentAtRef.current = now;
      typingService.setTyping(user.id, climberId as string, true).catch((error) => {
        if (process.env.EXPO_DEV_MODE) console.error('Failed to update typing status:', error);
      });
    }
  };

  const goBack = () => {
    router.back();
  };

  const deleteChat = async () => {
    if (!user?.id || !climberId) return;
    try {
      // Delete all messages between these two users
      await messageService.deleteChat(user.id, climberId as string);
      setMessages([]);
      router.back();
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('Failed to delete chat:', error);
    }
  };


  if (blocked) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>You cannot message this user.</Text>
        <Text style={styles.blockedSubtitle}>
          This conversation is unavailable because one of you has blocked the other.
        </Text>
        <Pressable onPress={goBack} style={styles.blockedBackButton}>
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
          <Text style={styles.blockedBackButtonText}>Go back</Text>
        </Pressable>
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
        <Pressable onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
        </Pressable>
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
        ListFooterComponent={
          isPartnerTyping ? (
            <View style={styles.typingIndicator}>
              <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
              <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
              <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
              <Text style={styles.typingText}>Typing...</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          placeholderTextColor="#a1a1aa"
          multiline
          maxLength={1000}
          onBlur={() => {
            if (user?.id && climberId) {
              typingService.setTyping(user.id, climberId as string, false).catch((error) => {
                if (process.env.EXPO_DEV_MODE) console.error('Failed to clear typing status on blur:', error);
              });
            }
          }}
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
        onMessage={() => { }}
        userLatitude={user?.latitude}
        userLongitude={user?.longitude}
      />

      {/* Chat Menu Modal */}
      <ChatMenuModal
        visible={menuVisible}
        climberName={(climberName as string) || ''}
        onClose={() => setMenuVisible(false)}
        onDeleteChat={deleteChat}
        darkMode={darkMode}
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
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
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
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    menuButton: {
      padding: 8,
    },
    headerSpacer: {
      width: 0,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 20,
    },
    messageContainer: {
      marginBottom: 12,
      maxWidth: '85%',
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    ownMessage: {
      alignSelf: 'flex-end',
    },
    otherMessage: {
      alignSelf: 'flex-start',
    },
    messageContent: {
      maxWidth: '100%',
      backgroundColor: 'transparent',
    },
    messageText: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 22,
      fontSize: 16,
      lineHeight: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    ownMessageText: {
      backgroundColor: theme.colors.accent,
      color: '#ffffff',
    },
    otherMessageText: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
    messageBubble: {
      maxWidth: '100%',
    },
    reactionBadge: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    ownReactionBadge: {
      alignSelf: 'flex-end',
    },
    otherReactionBadge: {
      alignSelf: 'flex-start',
    },
    reactionBadgeText: {
      fontSize: 12,
      color: theme.colors.text,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      backgroundColor: 'transparent',
    },
    likeButton: {
      marginLeft: 8,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    likeButtonDisabled: {
      opacity: 0.5,
    },
    blockedContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: theme.colors.background,
    },
    blockedTitle: {
      color: theme.colors.error,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    blockedSubtitle: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    blockedBackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 999,
    },
    blockedBackButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.textSecondary,
    },
    typingText: {
      marginLeft: 6,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 54,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -4 },
      elevation: 6,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 16,
      maxHeight: 100,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    sendButtonDisabled: {
      backgroundColor: '#374151',
    },
  });

const lightStyles = createStyles(themeLight);
const darkStyles = createStyles(themeDark);
