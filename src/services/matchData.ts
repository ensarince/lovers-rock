import { Climber } from '@/src/types/climber';
import { Match } from '../types/match';
import { getAllAccounts } from './accountService';

/**
 * Returns users who have sent a partner request to the current user (i.e., current user's id is in their liked_users_partner, but not mutual)
 */
export const getIncomingPartnerRequests = async (currentUserId: string, token: string): Promise<Climber[]> => {
  const allUsers = await getAllAccounts(token);
  const currentUser = allUsers.find(u => u.id === currentUserId);
  const currentUserLikedPartner = currentUser?.liked_users_partner || [];
  const currentUserLikedDating = currentUser?.liked_users_dating || [];
  
  // Users who liked current user in partner mode, but current user hasn't liked them back in partner mode
  return allUsers
    .filter(user => {
      if (user.id === currentUserId) return false;
      const userLikedPartner = user.liked_users_partner || [];
      const likedCurrentForPartner = userLikedPartner.includes(currentUserId);
      const notMutualPartner = !currentUserLikedPartner.includes(user.id);
      // Only show if intent includes 'partner'
      const hasPartnerIntent = Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner';
      return likedCurrentForPartner && notMutualPartner && hasPartnerIntent;
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
 * Accept a partner request (add the requester's id to current user's liked_users_partner)
 */
export const acceptPartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  // Fetch all users
  const allUsers = await getAllAccounts(token);
  const currentUser = allUsers.find(u => u.id === currentUserId);
  if (!currentUser) throw new Error('Current user not found');
  const updatedLiked = Array.from(new Set([...(currentUser.liked_users_partner || []), requesterId]));
  // Update liked_users_partner in backend
  await fetch(
    `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${currentUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ liked_users_partner: updatedLiked }),
    }
  );
};

/**
 * Get matches (mutual likes)
 * Now supports separate dating and partner matches
 * Users with both intents enabled can have TWO separate matches
 */
export const getMatches = async (token: string, currentUserId: string): Promise<Match[]> => {
  try {
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    if (!currentUser) return [];

    const currentUserLikedDating = currentUser.liked_users_dating || [];
    const currentUserLikedPartner = currentUser.liked_users_partner || [];
    const currentUserIntent = Array.isArray(currentUser.intent) ? currentUser.intent : [currentUser.intent];

    const matchesMap: Record<string, Match> = {};
    const matchedUserIds: Set<string> = new Set();

    for (const user of allUsers) {
      if (user.id === currentUserId) continue;
      
      const userLikedDating = user.liked_users_dating || [];
      const userLikedPartner = user.liked_users_partner || [];
      const userIntent = Array.isArray(user.intent) ? user.intent : [user.intent];

      // Check for DATING match
      if (
        currentUserIntent.includes('date') &&
        userIntent.includes('date') &&
        currentUserLikedDating.includes(user.id) &&
        userLikedDating.includes(currentUserId)
      ) {
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

        const matchId = `${user.id}-dating-match`;
        matchesMap[matchId] = {
          id: matchId,
          climber: normalizedClimber,
          matchedAt: Date.now() - Math.random() * 86400000 * 7,
          messagePreview: 'You matched! Say hello 💕',
          unreadCount: Math.floor(Math.random() * 3),
          type: 'dating',
        };
        matchedUserIds.add(user.id);
      }

      // Check for PARTNER match
      if (
        currentUserIntent.includes('partner') &&
        userIntent.includes('partner') &&
        currentUserLikedPartner.includes(user.id) &&
        userLikedPartner.includes(currentUserId)
      ) {
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

        const matchId = `${user.id}-partner-match`;
        matchesMap[matchId] = {
          id: matchId,
          climber: normalizedClimber,
          matchedAt: Date.now() - Math.random() * 86400000 * 7,
          messagePreview: 'You matched! Find a partner 🧗',
          unreadCount: Math.floor(Math.random() * 3),
          type: 'partner',
        };
        matchedUserIds.add(user.id);
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
