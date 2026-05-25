import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import { SkeletonRow } from '@/src/components/SkeletonLoader';
import { getMatches } from '@/src/services/matchData';
import { messageService } from '@/src/services/messageService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import type { Conversation } from '@/src/types/message';
import { getPocketBaseUrl, intentIncludes } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';


export default function MessagesScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [introModalVisible, setIntroModalVisible] = useState(false);
    const { user, token, darkMode, refreshUnreadMessageCount } = useAuth();
    const theme = darkMode ? themeDark : themeLight;
    const styles = createStyles(theme);
    const unreadConversations = conversations.filter((conversation) => conversation.unreadCount > 0).length;
    React.useEffect(() => {
        if (loading) return;
        if (conversations.length === 0) return;
        AsyncStorage.getItem('intro_seen_messages').then(val => {
            if (!val) setIntroModalVisible(true);
        });
    }, [loading, conversations.length]);

    const dismissIntro = () => {
        dismissIntro();
        AsyncStorage.setItem('intro_seen_messages', '1');
    };

    // Check intents
    const hasDatingIntent = user && intentIncludes(user.intent, 'date');
    const hasPartnerIntent = user && intentIncludes(user.intent, 'partner');

    useFocusEffect(
        React.useCallback(() => {
            if (token) {
                messageService.setToken(token);
                loadConversations();
            }
        }, [token, user?.id])
    );

    const loadConversations = async () => {
        if (!user?.id || !token) return;

        try {
            setLoading(true);
            const matches = await getMatches(token, user.id);

            const conversationsWithMessages = await Promise.all(
                matches.map(async (match) => {
                    try {
                        const messages = await messageService.getMessagesBetweenUsers(user.id, match.climber.id);
                        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
                        // Only count unread messages not sent by the user
                        const unreadMessages = messages.filter(
                            m => !m.read && m.sender_id !== user.id
                        );
                        // Only show unread if last message is NOT sent by user and there are unread messages
                        let unreadCount = 0;
                        if (
                            lastMessage &&
                            lastMessage.sender_id !== user.id &&
                            unreadMessages.length > 0
                        ) {
                            unreadCount = unreadMessages.length;
                        }

                        return {
                            matchId: match.id,
                            climber: match.climber,
                            lastMessage,
                            unreadCount,
                            matchType: (match.type as 'dating' | 'partner') || 'dating'
                        };
                    } catch (error) {
                        if (process.env.EXPO_DEV_MODE) console.error('Error loading messages for match:', match.id, error);
                        return {
                            matchId: match.id,
                            climber: match.climber,
                            lastMessage: undefined,
                            unreadCount: 0,
                            matchType: (match.type as 'dating' | 'partner') || 'dating'
                        };
                    }
                })
            );

            // Show all matches — ones without messages get "Say hello" placeholder
            setConversations(conversationsWithMessages);
            await refreshUnreadMessageCount();
        } catch (err) {
            if (process.env.EXPO_DEV_MODE) console.error('Failed to load conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadConversations();
        } finally {
            setRefreshing(false);
        }
    };

    const openChat = (conversation: Conversation) => {
        const POCKETBASE_URL = getPocketBaseUrl();
        let avatarUrl = '';
        if (conversation.climber.images && conversation.climber.images.length > 0) {
            avatarUrl = `${POCKETBASE_URL}/api/files/users/${conversation.climber.id}/${conversation.climber.images[0]}?thumb=40x40`;
        }
        router.push({
            pathname: '/chat',
            params: {
                matchId: conversation.matchId,
                climberName: conversation.climber.name,
                climberId: conversation.climber.id,
                climberAvatar: avatarUrl,
                climberData: JSON.stringify(conversation.climber)
            }
        });
    };

    const renderConversation = ({ item }: { item: Conversation }) => {
        // Only show unread badge if there are unread messages and the last message is not sent by the user
        const showUnread = item.unreadCount > 0;

        // Determine if we should show this conversation based on intents
        const shouldShow = (item.matchType === 'dating' && hasDatingIntent) ||
            (item.matchType === 'partner' && hasPartnerIntent);

        if (!shouldShow) return null;

        // Get the image URL - prefer images array, then image_url, then avatar
        let imageUrl = '';
        if (item.climber?.images && item.climber.images.length > 0) {
            const baseUrl = getPocketBaseUrl();
            imageUrl = `${baseUrl}/api/files/users/${item.climber.id}/${item.climber.images[0]}?thumb=100x100`;
        } else if (item.climber?.image_url) {
            imageUrl = item.climber.image_url;
        } else if (item.climber?.avatar && item.climber?.id) {
            const baseUrl = getPocketBaseUrl();
            imageUrl = `${baseUrl}/api/files/users/${item.climber.id}/${item.climber.avatar}?thumb=100x100`;
        }

        return (
            <Pressable style={styles.conversationItem} onPress={() => openChat(item)}>
                {/* Avatar with unread ring + dot */}
                <View style={styles.avatarWrapper}>
                    {showUnread && <View style={styles.avatarUnreadRing} />}
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.avatar}
                    />
                    {showUnread && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.conversationContent}>
                    <View style={styles.headerRow}>
                        <View style={styles.nameAndBadgeRow}>
                            <Text style={[styles.climberName, showUnread && styles.climberNameUnread]}>
                                {item.climber.name}
                            </Text>
                            <View style={[
                                styles.matchTypeBadge,
                                item.matchType === 'dating' ? styles.datingBadge : styles.partnerBadge
                            ]}>
                                <Text style={styles.matchTypeBadgeText}>
                                    {item.matchType === 'dating' ? '💕' : '🤝'}
                                </Text>
                            </View>
                        </View>
                        {item.lastMessage && (
                            <Text style={[styles.timestamp, showUnread && styles.timestampUnread]}>
                                {new Date(item.lastMessage.created).toLocaleDateString()}
                            </Text>
                        )}
                    </View>

                    <Text style={[styles.lastMessage, showUnread && styles.lastMessageUnread]} numberOfLines={1}>
                        {item.lastMessage?.content || 'Say hello 👋'}
                    </Text>
                </View>

                {showUnread && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}

                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + '66'} style={{ marginLeft: 4 }} />
            </Pressable>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <SkeletonRow count={5} />
            </View>
        );
    }

    if (conversations.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Ionicons name="chatbubble-outline" size={34} color={theme.colors.textSecondary} />
                </View>
                <Text style={styles.title}>No matches yet</Text>
                <Text style={styles.subtitle}>
                    Match with someone on the Discover tab to start chatting.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                renderItem={renderConversation}
                keyExtractor={(item) => item.matchId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.text}
                        colors={[theme.colors.text]}
                    />
                }
            />

            <Modal
                visible={introModalVisible}
                transparent
                animationType="fade"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={() => dismissIntro()}
            >
                <Pressable style={styles.introOverlay} onPress={() => dismissIntro()}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <LinearGradient
                            colors={
                                darkMode
                                    ? ['rgba(255,46,99,0.18)', 'rgba(52,211,207,0.16)']
                                    : ['rgba(255,46,99,0.12)', 'rgba(26,166,163,0.10)']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.introCard}
                        >
                            <View style={styles.introHeader}>
                                <Text style={styles.heroEyebrow}>Messages</Text>
                                <Pressable onPress={() => dismissIntro()} style={styles.introCloseButton}>
                                    <Ionicons name="close" size={20} color={theme.colors.text} />
                                </Pressable>
                            </View>
                            <Text style={styles.heroTitle}>Stay close to your active chats</Text>
                            <Text style={styles.introBodyText}>
                                Open any conversation to continue where you left off. This page stays clean once you close the intro.
                            </Text>
                            <Pressable style={styles.introActionButton} onPress={() => dismissIntro()}>
                                <Text style={styles.introActionText}>Open inbox</Text>
                            </Pressable>
                        </LinearGradient>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const createStyles = (theme: typeof themeLight) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        // ─── Intro modal ──────────────────────────────────────────────
        heroEyebrow: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: theme.colors.textSecondary,
            marginBottom: 6,
        },
        heroTitle: {
            fontSize: 22,
            lineHeight: 29,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 8,
        },
        heroSubtitle: {
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.textSecondary,
        },
        heroPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.70)',
            borderWidth: 1,
            borderColor: 'rgba(23,32,45,0.06)',
        },
        heroPillText: {
            fontSize: 12,
            fontWeight: '700',
            color: theme.colors.text,
        },
        introOverlay: {
            flex: 1,
            backgroundColor: 'rgba(8,12,18,0.88)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
        },
        introCard: {
            width: '100%',
            borderRadius: 28,
            padding: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            overflow: 'hidden',
            backgroundColor: theme.colors.surface,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 14 },
            elevation: 16,
        },
        introHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            backgroundColor: 'transparent',
        },
        introCloseButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
        },
        introBodyText: {
            fontSize: 14,
            lineHeight: 22,
            color: theme.colors.textSecondary,
            marginBottom: 20,
        },
        introActionButton: {
            alignSelf: 'flex-start',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },
        introActionText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 0.3,
        },
        // ─── Empty / loading states ───────────────────────────────────
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 36,
            paddingBottom: 24,
            backgroundColor: theme.colors.background,
        },
        title: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.text,
            marginTop: 18,
            marginBottom: 8,
            letterSpacing: 0.2,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: 21,
        },
        // ─── List ─────────────────────────────────────────────────────
        listContent: {
            paddingTop: 10,
            paddingBottom: 28,
        },
        // ─── Conversation row ─────────────────────────────────────────
        conversationItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginHorizontal: 14,
            marginVertical: 4,
            backgroundColor: theme.colors.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.20,
            shadowRadius: 14,
            elevation: 6,
        },
        // ─── Avatar ───────────────────────────────────────────────────
        avatarWrapper: {
            position: 'relative',
            width: 54,
            height: 54,
            marginRight: 13,
        },
        avatar: {
            width: 54,
            height: 54,
            borderRadius: 17,
            backgroundColor: theme.colors.background,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.08)',
        },
        avatarUnreadRing: {
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: 19,
            borderWidth: 2,
            borderColor: theme.colors.accent,
        },
        unreadDot: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 13,
            height: 13,
            borderRadius: 6.5,
            backgroundColor: theme.colors.accent,
            borderWidth: 2,
            borderColor: theme.colors.surface,
        },
        // ─── Text content ─────────────────────────────────────────────
        conversationContent: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: 'transparent',
            alignItems: 'center',
            marginBottom: 3,
        },
        nameAndBadgeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: 'transparent',
            flex: 1,
            marginRight: 8,
        },
        climberName: {
            fontSize: 15,
            fontWeight: '700',
            color: theme.colors.text,
            letterSpacing: 0.1,
        },
        climberNameUnread: {
            color: '#fff',
        },
        matchTypeBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        datingBadge: {
            backgroundColor: 'rgba(255,46,99,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(255,46,99,0.25)',
        },
        partnerBadge: {
            backgroundColor: 'rgba(52,211,207,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(52,211,207,0.22)',
        },
        matchTypeBadgeText: {
            fontSize: 11,
            backgroundColor: 'transparent',
        },
        timestamp: {
            fontSize: 11,
            color: theme.colors.textSecondary + 'AA',
            letterSpacing: 0.1,
        },
        timestampUnread: {
            color: theme.colors.accent,
            fontWeight: '600',
        },
        lastMessage: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            lineHeight: 19,
        },
        lastMessageUnread: {
            color: theme.colors.text,
            fontWeight: '500',
        },
        // ─── Unread badge ─────────────────────────────────────────────
        unreadBadge: {
            backgroundColor: theme.colors.accent,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
            paddingHorizontal: 5,
            shadowColor: theme.colors.accent,
            shadowOpacity: 0.4,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
        },
        unreadText: {
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
        },
    });
