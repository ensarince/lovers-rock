import { Climber } from '@/src/types/climber';
import { getAllAccounts } from './accountService';

export interface Match {
  id: string;
  climber: Climber;
  matchedAt: number;
  messagePreview?: string;
  unreadCount: number;
}

/**
 * Get matches (mutual likes)
 */
export const getMatches = async (token: string, currentUserId: string): Promise<Match[]> => {
  try {
    const allUsers = await getAllAccounts(token);

    // Find current user's liked users
    const currentUser = allUsers.find(u => u.id === currentUserId);
    const currentUserLiked = currentUser?.liked_users || [];

    // Find users who have liked the current user back (mutual matches)
    const matches: Match[] = [];

    for (const user of allUsers) {
      if (user.id === currentUserId) continue;

      const userLiked = user.liked_users || [];
      
      // Check for mutual like: current user liked this user AND this user liked current user
      const currentLikedThisUser = currentUserLiked.includes(user.id);
      const thisUserLikedCurrent = userLiked.includes(currentUserId);
      
      if (currentLikedThisUser && thisUserLikedCurrent) {
        
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

        matches.push({
          id: `${user.id}-match`,
          climber: normalizedClimber,
          matchedAt: Date.now() - Math.random() * 86400000 * 7, // Random time within last week
          messagePreview: 'You matched! Say hello 👋',
          unreadCount: Math.floor(Math.random() * 3), // Random unread count
        });
      }
    }

    return matches;
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
