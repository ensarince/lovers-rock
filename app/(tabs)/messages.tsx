import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { getMatches } from '@/src/services/matchData';
import { messageService } from '@/src/services/messageService';
import { theme } from '@/src/theme';
import { Conversation } from '@/src/types/message';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
    const { user, token } = useAuth();

    useEffect(() => {
        if (token) {
            messageService.setToken(token);
            loadConversations();
        }
    }, [token, user?.id]);

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
                        const unreadCount = messages.filter(m => !m.read && m.sender_id !== user.id).length;

                        return {
                            matchId: match.id,
                            climber: match.climber,
                            lastMessage,
                            unreadCount
                        };
                    } catch (error) {
                        console.error('Error loading messages for match:', match.id, error);
                        return {
                            matchId: match.id,
                            climber: match.climber,
                            lastMessage: undefined,
                            unreadCount: 0
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

    const renderConversation = ({ item }: { item: Conversation }) => (
        <Pressable style={styles.conversationItem} onPress={() => openChat(item)}>
            <Image
                source={{ uri: item.climber?.image_url }}
                style={styles.avatar}
            />

            <View style={styles.conversationContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.climberName}>{item.climber.name}</Text>
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

            {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
            )}

            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </Pressable>
    );

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

const styles = StyleSheet.create({
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
    climberName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
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