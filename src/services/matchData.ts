import { Climber } from '@/src/types/climber';
import { Match } from '../types/match';
import { getAllAccounts } from './accountService';

/**
 * Returns users who have sent a partner request to the current user (i.e., current user's id is in their liked_users, but not mutual)
 */
export const getIncomingPartnerRequests = async (currentUserId: string, token: string): Promise<Climber[]> => {
  const allUsers = await getAllAccounts(token);
  const currentUser = allUsers.find(u => u.id === currentUserId);
  const currentUserLiked = currentUser?.liked_users || [];
  // Users who liked current user, but current user hasn't liked them back
  return allUsers
    .filter(user => {
      if (user.id === currentUserId) return false;
      const userLiked = user.liked_users || [];
      const likedCurrent = userLiked.includes(currentUserId);
      const notMutual = !currentUserLiked.includes(user.id);
      // Only show if intent includes 'partner'
      const hasPartnerIntent = Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner';
      return likedCurrent && notMutual && hasPartnerIntent;
    })
    .map(user => {
      // Normalize climbing_styles and image_url
      const climbing_styles = typeof user.climbing_styles === 'string'
        ? JSON.parse(user.climbing_styles)
        : user.climbing_styles || [];
      let avatarUrl = '';
      if (user.avatar && user.id) {
        const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
        avatarUrl = `${baseUrl}/api/files/users/${user.id}/${user.avatar}?thumb=100x100`;
      }
      return {
        ...user,
        climbing_styles,
        image_url: avatarUrl,
      };
    });
};

/**
 * Accept a partner request (add the requester's id to current user's liked_users)
 * This is a placeholder; you should implement the backend call to update liked_users
 */
export const acceptPartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  // Fetch all users
  const allUsers = await getAllAccounts(token);
  const currentUser = allUsers.find(u => u.id === currentUserId);
  if (!currentUser) throw new Error('Current user not found');
  const updatedLiked = Array.from(new Set([...(currentUser.liked_users || []), requesterId]));
  // Update liked_users in backend (implement this with a PATCH request)
  await fetch(
    `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${currentUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ liked_users: updatedLiked }),
    }
  );
};

/**
 * Get matches (mutual likes)
 */
export const getMatches = async (token: string, currentUserId: string): Promise<Match[]> => {
  try {
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    if (!currentUser) return [];

    const currentUserLiked = currentUser.liked_users || [];
    const currentUserIntent = Array.isArray(currentUser.intent) ? currentUser.intent : [currentUser.intent];

    const matchesMap: Record<string, Match> = {};

    for (const user of allUsers) {
      if (user.id === currentUserId) continue;
      const userLiked = user.liked_users || [];
      const userIntent = Array.isArray(user.intent) ? user.intent : [user.intent];

      // Mutual like
      if (currentUserLiked.includes(user.id) && userLiked.includes(currentUserId)) {
        // Determine match type: partner > dating
        let matchType: 'partner' | 'dating' | null = null;
        if (currentUserIntent.includes('partner') && userIntent.includes('partner')) {
          matchType = 'partner';
        } else if (currentUserIntent.includes('date') && userIntent.includes('date')) {
          matchType = 'dating';
        }

        if (matchType) {
          // Normalize climbing_styles
          const climbing_styles = typeof user.climbing_styles === 'string'
            ? JSON.parse(user.climbing_styles)
            : user.climbing_styles || [];
          let avatarUrl = '';
          if (user.avatar && user.id) {
            const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
            avatarUrl = `${baseUrl}/api/files/users/${user.id}/${user.avatar}?thumb=100x100`;
          }
          const normalizedClimber: Climber = {
            ...user,
            climbing_styles,
            image_url: avatarUrl,
          };

          // Only add if not already matched as partner (no duplicate as dating)
          if (!matchesMap[user.id] || matchType === 'partner') {
            matchesMap[user.id] = {
              id: `${user.id}-match`,
              climber: normalizedClimber,
              matchedAt: Date.now() - Math.random() * 86400000 * 7,
              messagePreview: 'You matched! Say hello 👋',
              unreadCount: Math.floor(Math.random() * 3),
              type: matchType,
            };
          }
        }
      }
    }

    return Object.values(matchesMap);
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return [];
  }
};

/**
 * Get match conversation (messages)
 */
export interface Message {
  id: string;
  matchId: string;
  senderId: string; // 'user' or climber id
  text: string;
  timestamp: number;
}

export const getMessages = async (matchId: string): Promise<Message[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: '1',
          matchId,
          senderId: 'user',
          text: 'Hey! How are you?',
          timestamp: Date.now() - 300000,
        },
        {
          id: '2',
          matchId,
          senderId: matchId.split('-')[0],
          text: 'Doing great! Just got back from climbing',
          timestamp: Date.now() - 240000,
        },
        {
          id: '3',
          matchId,
          senderId: 'user',
          text: 'That sounds awesome! Where do you usually climb?',
          timestamp: Date.now() - 180000,
        },
        {
          id: '4',
          matchId,
          senderId: matchId.split('-')[0],
          text: 'Mostly at Red Rock, but I love road trips!',
          timestamp: Date.now() - 60000,
        },
      ];

      resolve(mockMessages);
    }, 200);
  });
};
