import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { getMatches } from '@/src/services/matchData';
import { messageService } from '@/src/services/messageService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import type { Conversation } from '@/src/types/message';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
} from 'react-native';

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user, token, darkMode } = useAuth();
    const theme = darkMode ? themeDark : themeLight;
    const styles = createStyles(theme);

    // Check intents
    const hasDatingIntent = user && (Array.isArray(user.intent) ? user.intent.includes('date') : user.intent === 'date');
    const hasPartnerIntent = user && (Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner');

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
                        console.error('Error loading messages for match:', match.id, error);
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

            setConversations(conversationsWithMessages);
        } catch (err) {
            console.error('Failed to load conversations:', err);
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
        router.push({
            pathname: '/chat',
            params: {
                matchId: conversation.matchId,
                climberName: conversation.climber.name,
                climberId: conversation.climber.id
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

        return (
            <Pressable style={styles.conversationItem} onPress={() => openChat(item)}>
                <Image
                    source={{ uri: item.climber?.image_url }}
                    style={styles.avatar}
                />

                <View style={styles.conversationContent}>
                    <View style={styles.headerRow}>
                        <View style={styles.nameAndBadgeRow}>
                            <Text style={styles.climberName}>{item.climber.name}</Text>
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
                            <Text style={styles.timestamp}>
                                {new Date(item.lastMessage.created).toLocaleDateString()}
                            </Text>
                        )}
                    </View>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage?.content || 'No messages yet'}
                    </Text>
                </View>

                {showUnread && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}

                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </Pressable>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
        );
    }

    if (conversations.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="chatbubble-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.title}>No conversations yet</Text>
                <Text style={styles.subtitle}>
                    Start chatting with your matches!
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
        </View>
    );
}

const createStyles = (theme: typeof themeLight) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: theme.colors.background,
        },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: theme.colors.surface,
    },
    conversationContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameAndBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'transparent',
    },
    climberName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    matchTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datingBadge: {
        backgroundColor: '#FF69B4' + '20',
        borderWidth: 1,
        borderColor: '#FF69B4' + '40',
    },
    partnerBadge: {
        backgroundColor: '#4169E1' + '20',
        borderWidth: 1,
        borderColor: '#4169E1' + '40',
    },
    matchTypeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: 'transparent',
    },
    timestamp: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    lastMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    unreadBadge: {
        backgroundColor: theme.colors.accent,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        paddingHorizontal: 6,
    },
    unreadText: {
        color: theme.colors.background,
        fontSize: 12,
        fontWeight: '600',
    },
});