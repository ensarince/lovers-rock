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
      // Normalize climbing_styles and preserve images array
      const climbing_styles = typeof user.climbing_styles === 'string'
        ? JSON.parse(user.climbing_styles)
        : user.climbing_styles || [];
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      // Preserve images array with filenames for ImageCarousel
      const images = user.images && user.images.length > 0 ? user.images : (user.avatar ? [user.avatar] : []);
      let avatarUrl = '';
      // Build URL for single avatar
      if (images.length > 0) {
        avatarUrl = `${baseUrl}/api/files/users/${user.id}/${images[0]}?thumb=100x100`;
      }
      return {
        ...user,
        climbing_styles,
        images,
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
 * Decline a partner request (remove the current user's id from requester's liked_users_partner)
 */
export const declinePartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  // Fetch all users
  const allUsers = await getAllAccounts(token);
  const requesterUser = allUsers.find(u => u.id === requesterId);
  if (!requesterUser) throw new Error('Requester user not found');
  
  // Remove current user ID from requester's liked_users_partner array
  const updatedLikedPartner = (requesterUser.liked_users_partner || []).filter(id => id !== currentUserId);
  
  console.log('🔄 Declining request:', { currentUserId, requesterId });
  console.log('📋 Updated liked_users_partner:', updatedLikedPartner);
  
  // Update requester's liked_users_partner in backend using the same pattern as acceptPartnerRequest
  const response = await fetch(
    `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${requesterId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ liked_users_partner: updatedLikedPartner }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Decline failed:', { status: response.status, error: errorText });
    throw new Error(`Failed to decline request: ${response.status} ${errorText}`);
  }
  
  console.log('✅ Successfully declined partner request');
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
        // Normalize climbing_styles and preserve images array
        const climbing_styles = typeof user.climbing_styles === 'string'
          ? JSON.parse(user.climbing_styles)
          : user.climbing_styles || [];
        const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
        // Preserve images array with filenames for ImageCarousel
        const images = user.images && user.images.length > 0 ? user.images : (user.avatar ? [user.avatar] : []);
        let avatarUrl = '';
        // Build URL for single avatar
        if (images.length > 0) {
          avatarUrl = `${baseUrl}/api/files/users/${user.id}/${images[0]}?thumb=100x100`;
        }
        const normalizedClimber: Climber = {
          ...user,
          climbing_styles,
          images,
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
        // Normalize climbing_styles and preserve images array
        const climbing_styles = typeof user.climbing_styles === 'string'
          ? JSON.parse(user.climbing_styles)
          : user.climbing_styles || [];
        const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
        // Preserve images array with filenames for ImageCarousel
        const images = user.images && user.images.length > 0 ? user.images : (user.avatar ? [user.avatar] : []);
        let avatarUrl = '';
        // Build URL for single avatar
        if (images.length > 0) {
          avatarUrl = `${baseUrl}/api/files/users/${user.id}/${images[0]}?thumb=100x100`;
        }
        const normalizedClimber: Climber = {
          ...user,
          climbing_styles,
          images,
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
 * Unmatch from a user (remove both users from each other's liked arrays)
 */
export const unmatchUser = async (currentUserId: string, targetUserId: string, matchType: 'dating' | 'partner', token: string): Promise<void> => {
  try {
    // Fetch all users data
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    const targetUser = allUsers.find(u => u.id === targetUserId);
    
    if (!currentUser) throw new Error('Current user not found');
    if (!targetUser) throw new Error('Target user not found');

    // Update current user's liked arrays
    let currentUserUpdateData: any = {};
    if (matchType === 'dating') {
      const updatedLikedDating = (currentUser.liked_users_dating || []).filter(id => id !== targetUserId);
      currentUserUpdateData.liked_users_dating = updatedLikedDating;
    } else if (matchType === 'partner') {
      const updatedLikedPartner = (currentUser.liked_users_partner || []).filter(id => id !== targetUserId);
      currentUserUpdateData.liked_users_partner = updatedLikedPartner;
    }

    // Update target user's liked arrays
    let targetUserUpdateData: any = {};
    if (matchType === 'dating') {
      const updatedTargetLikedDating = (targetUser.liked_users_dating || []).filter(id => id !== currentUserId);
      targetUserUpdateData.liked_users_dating = updatedTargetLikedDating;
    } else if (matchType === 'partner') {
      const updatedTargetLikedPartner = (targetUser.liked_users_partner || []).filter(id => id !== currentUserId);
      targetUserUpdateData.liked_users_partner = updatedTargetLikedPartner;
    }

    // Update both users in backend
    await Promise.all([
      fetch(
        `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${currentUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(currentUserUpdateData),
        }
      ),
      fetch(
        `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${targetUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(targetUserUpdateData),
        }
      )
    ]);
  } catch (error) {
    console.error('Failed to unmatch user:', error);
    throw error;
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
