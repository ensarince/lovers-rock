import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMenuModal } from '@/src/components/ChatMenuModal';
import { GifSearchModal } from '@/src/components/GifSearchModal';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { messageService } from '@/src/services/messageService';
import { getReportService } from '@/src/services/reportService';
import { setActiveConversationPartnerId } from '@/src/services/notificationService';
import { typingService } from '@/src/services/typingService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Match } from '@/src/types/match';
import { Message } from '@/src/types/message';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const HEART_REACTION = '\u2764\uFE0F';
const LEGACY_HEART_REACTION = '\u00e2\u009d\u00a4\u00ef\u00b8\u008f';

const QUICK_EMOJIS = ['\ud83d\ude02', '\u2764\uFE0F', '\ud83d\udd25', '\ud83d\udc4d', '\ud83d\ude4f', '\ud83d\ude0d', '\ud83e\udd23', '\ud83d\ude2d', '\ud83d\ude0e', '\ud83e\udd70', '\ud83d\udcaa', '\ud83c\udf89', '\ud83e\udd29', '\ud83d\ude0a', '\ud83d\ude05', '\ud83e\udef6', '\u26f0\uFE0F', '\ud83e\uddd7', '\ud83c\udfd4\uFE0F', '\ud83e\udea8'];

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
      message.receiver_id === nextMessage.receiver_id &&
      message.reply_to_id === nextMessage.reply_to_id
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

// ─── Swipeable message row ────────────────────────────────────────────────────
// Pan → swipe-to-reply | LongPress → reply | DoubleTap → like
function MessageItem({
  item,
  userId,
  isReacting,
  theme,
  styles,
  onLike,
  onReply,
  onImagePress,
  pbUrl,
}: {
  item: Message;
  userId: string;
  isReacting: boolean;
  theme: any;
  styles: any;
  pbUrl: string;
  onLike: (id: string) => void;
  onReply: (msg: Message) => void;
  onImagePress: (url: string) => void;
}) {
  const dragX = useSharedValue(0);

  // Refs so worklet callbacks always see the latest values
  const onReplyRef = useRef(onReply);
  const onLikeRef = useRef(onLike);
  const itemRef = useRef(item);
  const userIdRef = useRef(userId);
  const isReactingRef = useRef(isReacting);
  onReplyRef.current = onReply;
  onLikeRef.current = onLike;
  itemRef.current = item;
  userIdRef.current = userId;
  isReactingRef.current = isReacting;

  const onImagePressRef = useRef(onImagePress);
  onImagePressRef.current = onImagePress;
  const lastTapRef = useRef(0);

  const triggerReply = useCallback(() => {
    onReplyRef.current(itemRef.current);
  }, []);

  // Double-tap via JS timestamp — avoids all RNGH vs Pressable conflicts
  const handleBubblePress = useCallback(() => {
    const now = Date.now();
    const gap = now - lastTapRef.current;
    if (gap < 300 && gap > 0) {
      lastTapRef.current = 0;
      const cur = itemRef.current;
      if (cur.sender_id !== userIdRef.current && !isReactingRef.current) {
        onLikeRef.current(cur.id);
      }
      return;
    }
    lastTapRef.current = now;
    // Single-tap: open media
    const cur = itemRef.current;
    if (cur.message_type === 'image' && cur.image_attachment) {
      onImagePressRef.current(`${pbUrl}/api/files/messages/${cur.id}/${cur.image_attachment}`);
    } else if (cur.message_type === 'gif' && cur.attachment_url) {
      onImagePressRef.current(cur.attachment_url);
    }
  }, [pbUrl]);

  const initialTouchLocation = useSharedValue({ x: 0, y: 0 });

  // GestureDetector handles ONLY swipe-to-reply — no tap/longpress races
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((e) => {
          if (e.changedTouches.length === 0) return;
          initialTouchLocation.value = {
            x: e.changedTouches[0].x,
            y: e.changedTouches[0].y,
          };
        })
        .onTouchesMove((e, state) => {
          if (e.changedTouches.length === 0) return;
          const xDiff = Math.abs(e.changedTouches[0].x - initialTouchLocation.value.x);
          const yDiff = Math.abs(e.changedTouches[0].y - initialTouchLocation.value.y);
          if (xDiff > yDiff && xDiff > 10) {
            state.activate();
          } else if (yDiff > xDiff && yDiff > 10) {
            state.fail();
          }
        })
        .onUpdate((e) => { dragX.value = Math.max(0, e.translationX); })
        .onEnd(() => {
          const dx = dragX.value;
          dragX.value = withSpring(0, { damping: 20, stiffness: 300 });
          if (dx > 60) runOnJS(triggerReply)();
        }),
    []
  );

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.min(dragX.value * 0.5, 40) }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(dragX.value, [0, 60], [0.4, 1], Extrapolation.CLAMP) }],
  }));

  const isOwn = item.sender_id === userId;
  const userReaction = item.reactions?.[userId];
  const likedByCurrentUser = isHeartReaction(userReaction);
  const heartReactionCount = getHeartReactionCount(item);
  const isMedia = item.message_type === 'image' || item.message_type === 'gif';
  const messageImageUrl = item.image_attachment
    ? `${pbUrl}/api/files/messages/${item.id}/${item.image_attachment}`
    : null;
  const showReaction = isOwn ? heartReactionCount > 0 : likedByCurrentUser;

  return (
    <View style={styles.swipeableRow}>
      <Reanimated.View style={[styles.replyAction, replyIconStyle]}>
        <Ionicons name="return-up-forward" size={22} color={theme.colors.accent} />
      </Reanimated.View>
      <Reanimated.View style={[{ width: '100%' }, animatedRowStyle]}>
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.messageContent}>
              <Pressable
                style={[styles.messageBubble, isMedia && styles.mediaBubble]}
                onPress={handleBubblePress}
                onLongPress={triggerReply}
                delayLongPress={400}
              >
                {item.reply_to_preview ? (
                  <View style={[styles.replyQuote, isOwn ? styles.replyQuoteOwn : styles.replyQuoteOther]}>
                    <View style={styles.replyQuoteBar} />
                    <Text style={styles.replyQuoteText} numberOfLines={2}>{item.reply_to_preview}</Text>
                  </View>
                ) : null}
                {item.message_type === 'image' && messageImageUrl ? (
                  <Image source={{ uri: messageImageUrl }} style={styles.messageImage} resizeMode="cover" />
                ) : item.message_type === 'gif' && item.attachment_url ? (
                  <Image source={{ uri: item.attachment_url }} style={styles.messageImage} resizeMode="cover" />
                ) : (
                  <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                    {item.content}
                  </Text>
                )}
                <View style={styles.messageFooter}>
                  <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
                    {new Date(item.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {isOwn && (
                    <Ionicons
                      name={item.read ? 'checkmark-done' : 'checkmark'}
                      size={12}
                      color={item.read ? theme.colors.accent : theme.colors.textSecondary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </Pressable>
              {showReaction && (
                <Text style={[styles.receivedReaction, !isOwn && styles.sentReaction]}>❤️</Text>
              )}
            </View>
          </GestureDetector>
        </View>
      </Reanimated.View>
    </View>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const { user, token, darkMode, refreshUnreadMessageCount } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [climberData, setClimberData] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reactingToMessageIds, setReactingToMessageIds] = useState<string[]>([]);
  const [gifModalVisible, setGifModalVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [showDoubleTapHint, setShowDoubleTapHint] = useState(false);
  const messagesPageRef = useRef(1);
  const theme = darkMode ? themeDark : themeLight;
  const styles = darkMode ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();
  const { climberName, climberId, climberAvatar, climberData: climberDataStr } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);
  const fallbackPollingIntervalRef = useRef<number | null>(null);
  const conversationUnsubscribeRef = useRef<null | (() => Promise<void>)>(null);
  const typingUnsubscribeRef = useRef<null | (() => Promise<void>)>(null);
  const reactingToMessageIdsRef = useRef<string[]>([]);
  const typingExpireTimeoutRef = useRef<number | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const hasScrolledToBottomRef = useRef(false);
  const pbUrl = getPocketBaseUrl();
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

  // Fetch authoritative climber data from PocketBase; fall back to route params if network fails
  useEffect(() => {
    if (!climberId || !token) return;
    const POCKETBASE_URL = getPocketBaseUrl();
    fetch(`${POCKETBASE_URL}/api/collections/public_profiles/records/${climberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClimberData(data); })
      .catch(() => {
        // fallback: use route param data if fetch fails
        if (climberDataStr) {
          try { setClimberData(JSON.parse(climberDataStr as string)); } catch {}
        }
      });
  }, [climberId, token]);

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
    if (user?.id && climberId && token) {
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
        if (__DEV__) console.error('Failed to subscribe to typing status:', error);
      }
    };

    subscribeToTyping();

    return () => {
      isActive = false;
      clearTypingTimeout();
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current().catch((error) => {
          if (__DEV__) console.error('Failed to unsubscribe from typing status:', error);
        });
        typingUnsubscribeRef.current = null;
      }
    };
  }, [user?.id, climberId]);

  useEffect(() => {
    if (climberId) {
      setActiveConversationPartnerId(climberId as string);
    }
    return () => {
      setActiveConversationPartnerId(null);
    };
  }, [climberId]);

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
          if (__DEV__) console.error('Fallback polling error:', error);
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

            // If a reaction PATCH is in-flight for this message, preserve local
            // reactions — the SSE snapshot from a concurrent markMessagesAsRead
            // PATCH would otherwise carry stale reactions: {} and revert the heart.
            if (action === 'update' && reactingToMessageIdsRef.current.includes(message.id)) {
              setMessages((prev) =>
                prev.map((m) => (m.id === message.id ? { ...nextMessage, reactions: m.reactions } : m))
              );
            } else {
              applyMessageUpdate(nextMessage);
            }

            if (action === 'create' && message.sender_id !== user.id) {
              try {
                await messageService.markMessagesAsRead(climberId as string, user.id);
                await refreshUnreadMessageCount();
              } catch (error) {
                if (__DEV__) console.error('Failed to mark realtime message as read:', error);
              }
            }

            if (action === 'create') {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }
        );
      } catch (error) {
        if (__DEV__) console.error('Realtime subscription failed, using fallback polling:', error);
        startFallbackPolling();
      }
    };

    setupConversationSubscription();

    return () => {
      isActive = false;
      clearFallbackPolling();
      if (conversationUnsubscribeRef.current) {
        conversationUnsubscribeRef.current().catch((error) => {
          if (__DEV__) console.error('Failed to unsubscribe from conversation:', error);
        });
        conversationUnsubscribeRef.current = null;
      }
    };
  }, [user?.id, climberId]);

  const loadMessages = async () => {
    if (!user?.id || !climberId) return;
    let fetchSucceeded = false;
    try {
      setLoading(true);
      setError(null);
      const msgs = await messageService.getMessagesBetweenUsers(user.id, climberId as string, 1, 50);
      messagesPageRef.current = 1;
      setHasMoreMessages(msgs.length === 50);
      updateMessages(msgs);
      fetchSucceeded = true;
    } catch (err) {
      setError('Failed to load messages');
      if (__DEV__) console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
    if (!fetchSucceeded) return;
    messageService.markMessagesAsRead(climberId as string, user.id).catch((err) => {
      if (__DEV__) console.error('Failed to mark messages as read:', err);
    });
    refreshUnreadMessageCount().catch((err) => {
      if (__DEV__) console.error('Failed to refresh unread count:', err);
    });
  };

  const loadEarlierMessages = async () => {
    if (!user?.id || !climberId || !hasMoreMessages) return;
    const nextPage = messagesPageRef.current + 1;
    try {
      const older = await messageService.getMessagesBetweenUsers(user.id, climberId as string, nextPage, 50);
      if (older.length === 0) { setHasMoreMessages(false); return; }
      messagesPageRef.current = nextPage;
      setHasMoreMessages(older.length === 50);
      setMessages(prev => sortMessages([...prev, ...older]));
    } catch (err) {
      if (__DEV__) console.error('Failed to load earlier messages:', err);
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
      const replyPreview = replyingTo
        ? replyingTo.message_type === 'image' ? '📷 Photo'
          : replyingTo.message_type === 'gif' ? '🎞️ GIF'
          : (replyingTo.content.length > 60 ? replyingTo.content.slice(0, 60) + '…' : replyingTo.content)
        : undefined;
      const sentMessage = await messageService.sendMessage(user.id, climberId as string, newMessage, replyingTo?.id, replyPreview);
      setNewMessage('');
      setReplyingTo(null);
      inputRef.current?.clear();
      applyMessageUpdate(sentMessage);
      typingService.setTyping(user.id, climberId as string, false).catch((error) => {
        if (__DEV__) console.error('Failed to clear typing status after send:', error);
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      if (__DEV__) console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const pickAndSendImage = async () => {
    if (!user?.id || !climberId || sending || blocked) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setReplyingTo(null);
    setSending(true);
    try {
      // Compress: resize to max 800px width, JPEG 70%
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const sentMessage = await messageService.sendImageMessage(user.id, climberId as string, compressed.uri);
      applyMessageUpdate(sentMessage);
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    } catch (error: any) {
      const msg = String(error?.message || error || 'unknown error');
      if (msg.includes('rate limit')) {
        Alert.alert('Slow down', 'Max 20 images per hour.');
      } else {
        Alert.alert('Upload failed', msg);
      }
    } finally {
      setSending(false);
    }
  };

  const sendGif = async (gifUrl: string) => {
    if (!user?.id || !climberId || sending || blocked) return;
    setReplyingTo(null);
    setSending(true);
    try {
      const sentMessage = await messageService.sendGifMessage(user.id, climberId as string, gifUrl);
      applyMessageUpdate(sentMessage);
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    } catch (error) {
      if (__DEV__) console.error('Failed to send GIF:', error);
      Alert.alert('Failed to send GIF', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageItem
      item={item}
      userId={user?.id || ''}
      isReacting={reactingToMessageIds.includes(item.id)}
      theme={theme}
      styles={styles}
      pbUrl={pbUrl}
      onLike={handleToggleLike}
      onReply={setReplyingTo}
      onImagePress={setFullscreenImageUrl}
    />
  );
  const handleToggleLike = async (messageId: string) => {
    if (!user?.id || !token) return;
    const message = messages.find((currentMessage) => currentMessage.id === messageId);
    if (!message) return;
    const previousReaction = message.reactions?.[user.id];
    const nextReaction = isHeartReaction(previousReaction) ? null : HEART_REACTION;
    try {
      reactingToMessageIdsRef.current = [...reactingToMessageIdsRef.current, messageId];
      setReactingToMessageIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
      setReactionForMessage(messageId, nextReaction, user.id);
      await messageService.updateMessageReaction(messageId, user.id, nextReaction);
    } catch (error) {
      setReactionForMessage(messageId, previousReaction || null, user.id);
      if (__DEV__) console.error('Failed to update reaction:', error);
    } finally {
      reactingToMessageIdsRef.current = reactingToMessageIdsRef.current.filter((id) => id !== messageId);
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
        if (__DEV__) console.error('Failed to clear typing status:', error);
      });
      return;
    }

    if (now - lastTypingSentAtRef.current > 1500) {
      lastTypingSentAtRef.current = now;
      typingService.setTyping(user.id, climberId as string, true).catch((error) => {
        if (__DEV__) console.error('Failed to update typing status:', error);
      });
    }
  };

  const goBack = () => {
    router.back();
  };

  const dismissDoubleTapHint = useCallback(() => {
    setShowDoubleTapHint(false);
    AsyncStorage.setItem('chat_double_tap_hint_seen', '1');
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('chat_double_tap_hint_seen').then((seen) => {
      if (!seen) setShowDoubleTapHint(true);
    });
  }, []);

  useEffect(() => {
    if (!showDoubleTapHint) return;
    const t = setTimeout(dismissDoubleTapHint, 4000);
    return () => clearTimeout(t);
  }, [showDoubleTapHint, dismissDoubleTapHint]);

  const deleteChat = async () => {
    if (!user?.id || !climberId) return;
    try {
      // Delete all messages between these two users
      await messageService.deleteChat(user.id, climberId as string);
      setMessages([]);
      router.back();
    } catch (error) {
      if (__DEV__) console.error('Failed to delete chat:', error);
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
  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{climberName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>Failed to load messages</Text>
          <Pressable onPress={loadMessages} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: theme.colors.accent }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </View>
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
        showsVerticalScrollIndicator={false}
        initialNumToRender={50}
        onContentSizeChange={() => {
          if (!hasScrolledToBottomRef.current && messages.length > 0) {
            hasScrolledToBottomRef.current = true;
            requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: false }));
          }
        }}
        ListHeaderComponent={
          hasMoreMessages ? (
            <Pressable onPress={loadEarlierMessages} style={styles.loadEarlierButton}>
              <Ionicons name="chevron-up" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.loadEarlierText}>Load earlier messages</Text>
            </Pressable>
          ) : null
        }
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

      {/* Double-tap to like hint — shown once */}
      {showDoubleTapHint && (
        <Pressable style={styles.doubleTapHint} onPress={dismissDoubleTapHint}>
          <Ionicons name="heart" size={14} color="#ef4444" style={{ marginRight: 7 }} />
          <Text style={styles.doubleTapHintText}>Double tap a message to like it</Text>
        </Pressable>
      )}

      {/* Input */}
      <View style={styles.inputWrapper}>
        {replyingTo && (
          <View style={styles.replyStrip}>
            <Ionicons name="return-up-back" size={15} color={theme.colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.replyStripText} numberOfLines={1}>
              {replyingTo.message_type === 'image' ? '📷 Photo'
                : replyingTo.message_type === 'gif' ? '🎞️ GIF'
                : replyingTo.content}
            </Text>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={10} style={{ marginLeft: 6 }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        )}
        {showEmojiPicker && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.emojiRow}
            contentContainerStyle={styles.emojiRowContent}
            keyboardShouldPersistTaps="always"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.emojiButton}
                onPressIn={() => setNewMessage((prev) => prev + emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
          <Pressable
            style={styles.mediaButton}
            onPress={pickAndSendImage}
            disabled={sending || blocked}
            hitSlop={4}
          >
            <Ionicons name="image-outline" size={22} color={sending || blocked ? theme.colors.textSecondary : theme.colors.text} />
          </Pressable>
          <Pressable
            style={styles.mediaButton}
            onPress={() => setGifModalVisible(true)}
            disabled={sending || blocked}
            hitSlop={4}
          >
            <Text style={[styles.gifLabel, { color: sending || blocked ? theme.colors.textSecondary : theme.colors.text }]}>GIF</Text>
          </Pressable>
          <Pressable
            style={styles.mediaButton}
            onPress={() => setShowEmojiPicker((v) => !v)}
            hitSlop={4}
          >
            <Ionicons name={showEmojiPicker ? 'happy' : 'happy-outline'} size={22} color={showEmojiPicker ? theme.colors.accent : theme.colors.text} />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={newMessage}
            onChangeText={handleInputChange}
            placeholder="Message..."
            placeholderTextColor="#a1a1aa"
            multiline
            maxLength={1000}
            onBlur={() => {
              if (user?.id && climberId) {
                typingService.setTyping(user.id, climberId as string, false).catch((error) => {
                  if (__DEV__) console.error('Failed to clear typing status on blur:', error);
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

      <GifSearchModal
        visible={gifModalVisible}
        onClose={() => setGifModalVisible(false)}
        onSelect={sendGif}
        darkMode={darkMode}
      />

      {/* Fullscreen image viewer */}
      {fullscreenImageUrl !== null && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setFullscreenImageUrl(null)}>
          <Pressable style={styles.fullscreenOverlay} onPress={() => setFullscreenImageUrl(null)}>
            <Image source={{ uri: fullscreenImageUrl }} style={styles.fullscreenImage} resizeMode="contain" />
            <Pressable style={[styles.fullscreenClose, { top: insets.top + 12 }]} onPress={() => setFullscreenImageUrl(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
    receivedReaction: {
      fontSize: 13,
      marginRight: 4,
      marginTop: 3,
      alignSelf: 'flex-end',
    },
    sentReaction: {
      alignSelf: 'flex-start',
      marginLeft: 6,
      marginRight: 0,
    },
    doubleTapHint: {
      position: 'absolute',
      bottom: 90,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.72)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      zIndex: 50,
    },
    doubleTapHintText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '500',
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
    inputWrapper: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -4 },
      elevation: 6,
    },
    emojiRow: {
      maxHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    emojiRowContent: {
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    emojiButton: {
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    emojiText: {
      fontSize: 22,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 4,
    },
    mediaButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gifLabel: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: 16,
      maxHeight: 100,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
    mediaBubble: {
      padding: 0,
      overflow: 'hidden',
      borderRadius: 16,
    },
    messageImage: {
      width: 200,
      height: 160,
      borderRadius: 16,
    },
    swipeableRow: {
      position: 'relative',
      width: '100%',
    },
    replyAction: {
      position: 'absolute',
      left: 8,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      width: 40,
      zIndex: 0,
    },
    loadEarlierButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      gap: 6,
    },
    loadEarlierText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    replyQuote: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      marginBottom: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      gap: 8,
      minWidth: 120,
    },
    replyQuoteOwn: {
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    replyQuoteOther: {
      backgroundColor: theme.colors.border,
    },
    replyQuoteBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
    replyQuoteText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    replyStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    replyStripText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
    },
    fullscreenOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenImage: {
      width: '100%',
      height: '85%',
    },
    fullscreenClose: {
      position: 'absolute',
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const lightStyles = createStyles(themeLight);
const darkStyles = createStyles(themeDark);
