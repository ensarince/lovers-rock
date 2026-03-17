import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import { Match } from '../types/match';
import { getAllAccounts } from './accountService';

/**
 * Helper: Check if a decline is still active (not expired)
 * Dating declines expire after 1 month, partner declines after 3 months
 */
const isDeclineStillActive = (declinedItem: any, declineType: 'dating' | 'partner'): boolean => {
  // If it's just a string ID (old format), consider it active indefinitely
  if (typeof declinedItem === 'string') {
    return true;
  }
  
  // New format with timestamp
  if (declinedItem && typeof declinedItem === 'object' && declinedItem.declinedAt) {
    const expiryMs = declineType === 'dating' 
      ? 30 * 24 * 60 * 60 * 1000  // 1 month for dating
      : 90 * 24 * 60 * 60 * 1000; // 3 months for partner
    
    const timeSinceDeclining = Date.now() - declinedItem.declinedAt;
    return timeSinceDeclining < expiryMs;
  }
  
  return false;
};

/**
 * Helper: Get list of user IDs that have been actively declined (not expired)
 */
const getActiveDeclinedUserIds = (declinedList: any[], declineType: 'dating' | 'partner'): string[] => {
  if (!Array.isArray(declinedList)) return [];
  
  return declinedList
    .filter(item => isDeclineStillActive(item, declineType))
    .map(item => typeof item === 'string' ? item : item.userId)
    .filter(Boolean);
};

/**
 * Returns users who have sent a partner request to the current user (i.e., current user's id is in their liked_users_partner, but not mutual)
 * Filters out users who have been declined by the current user (stored in database field)
 * NOTE: If a declined user sends another request, they're automatically "undeclined" if accepted
 */
export const getIncomingPartnerRequests = async (currentUserId: string, token: string): Promise<Climber[]> => {
  const allUsers = await getAllAccounts(token);
  const currentUser = allUsers.find(u => u.id === currentUserId);
  const currentUserLikedPartner = currentUser?.liked_users_partner || [];
  const currentUserDeclinedUsersAsPartner = currentUser?.declined_users_as_partner || [];
  
  // Only get declined users whose decline is still active
  const activeDeclinedUserIds = getActiveDeclinedUserIds(currentUserDeclinedUsersAsPartner, 'partner');
  
  // Find all users who have liked current user in partner mode
  const allRequestingUsers = allUsers.filter(user => {
    const userLikedPartner = user.liked_users_partner || [];
    return userLikedPartner.includes(currentUserId);
  });
  
  // Users who liked current user in partner mode, but current user hasn't liked them back in partner mode
  // and haven't been actively declined by current user
  const filteredUsers = allUsers
    .filter(user => {
      if (user.id === currentUserId) return false;
      const userLikedPartner = user.liked_users_partner || [];
      const likedCurrentForPartner = userLikedPartner.includes(currentUserId);
      
      if (!likedCurrentForPartner) return false; // User didn't like current user
      
      const notMutualPartner = !currentUserLikedPartner.includes(user.id);
      const notDeclined = !activeDeclinedUserIds.includes(user.id);
      // Only show if intent includes 'partner'
      const hasPartnerIntent = Array.isArray(user.intent) ? user.intent.includes('partner') : user.intent === 'partner';
      
      const shouldInclude = notMutualPartner && notDeclined && hasPartnerIntent;
      return shouldInclude;
    })
    .map(user => {
      // Normalize climbing_styles and preserve images array
      const climbing_styles = typeof user.climbing_styles === 'string'
        ? JSON.parse(user.climbing_styles)
        : user.climbing_styles || [];
      const baseUrl = getPocketBaseUrl();
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
  
  return filteredUsers;
};

/**
 * Accept a partner request (add the requester's id to current user's liked_users_partner)
 */
export const acceptPartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  try {
    // Fetch all users
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    if (!currentUser) throw new Error('Current user not found');
    
    const updatedLiked = Array.from(new Set([...(currentUser.liked_users_partner || []), requesterId]));
    
    // Also remove from declined list if they were previously declined
    const updatedDeclined = (currentUser.declined_users_as_partner || []).filter(id => id !== requesterId);
    
    // Update both fields in backend
    await fetch(
      `${getPocketBaseUrl()}/api/collections/users/records/${currentUserId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          liked_users_partner: updatedLiked,
          declined_users_as_partner: updatedDeclined
        }),
      }
    );
  } catch (error) {
    console.error('❌ Accept operation failed:', error);
    throw error;
  }
};

/**
 * Decline a partner request (add to current user's declined_users_as_partner array with timestamp)
 * Declined users won't show again for 3 months (unified decline strategy with dating declines)
 */
export const declinePartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  try {
    // Validate inputs
    if (!currentUserId || !requesterId || !token) {
      throw new Error('Invalid parameters: currentUserId, requesterId, and token are required');
    }
    
    if (currentUserId === requesterId) {
      throw new Error('Cannot decline a request from yourself');
    }
    
    // Fetch current user to get their declined list
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    
    if (!currentUser) {
      throw new Error('Current user not found');
    }
    
    // Parse declined_users_as_partner (array of {userId: string, declinedAt: number})
    let declinedList = [];
    const declinedRaw = currentUser.declined_users_as_partner;
    if (Array.isArray(declinedRaw)) {
      declinedList = declinedRaw;
    } else if (typeof declinedRaw === 'string') {
      try {
        declinedList = JSON.parse(declinedRaw);
      } catch {
        declinedList = [];
      }
    }
    
    // Check if already declined
    const alreadyDeclined = declinedList.some((item: any) => {
      const id = typeof item === 'string' ? item : item.userId;
      return id === requesterId;
    });
    
    if (!alreadyDeclined) {
      // Add new decline with timestamp (expires after 3 months)
      declinedList.push({
        userId: requesterId,
        declinedAt: Date.now()
      });
    }
    
    // Update current user's declined_users_as_partner in database
    const updateResponse = await fetch(
      `${getPocketBaseUrl()}/api/collections/users/records/${currentUserId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ declined_users_as_partner: declinedList }),
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update partner declined list:', {
        status: updateResponse.status,
        error: errorText
      });
      throw new Error(`Failed to update partner declined list: ${updateResponse.status} ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Partner decline operation failed:', error);
    throw error;
  }
};

/**
 * Decline a dating user (add to current user's declined_users_as_dating array with timestamp)
 * Declined users won't show again for 1 month
 */
export const declineDatingUser = async (currentUserId: string, declinedUserId: string, token: string): Promise<void> => {
  try {
    // Validate inputs
    if (!currentUserId || !declinedUserId || !token) {
      throw new Error('Invalid parameters: currentUserId, declinedUserId, and token are required');
    }
    
    if (currentUserId === declinedUserId) {
      throw new Error('Cannot decline yourself');
    }
    
    // Fetch current user to get their declined list
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    
    if (!currentUser) {
      throw new Error('Current user not found');
    }
    
    // Parse declined_users_as_dating (array of {userId: string, declinedAt: number})
    let declinedList = [];
    const declinedRaw = currentUser.declined_users_as_dating;
    if (Array.isArray(declinedRaw)) {
      declinedList = declinedRaw;
    } else if (typeof declinedRaw === 'string') {
      try {
        declinedList = JSON.parse(declinedRaw);
      } catch {
        declinedList = [];
      }
    }
    
    // Check if already declined
    const alreadyDeclined = declinedList.some((item: any) => {
      const id = typeof item === 'string' ? item : item.userId;
      return id === declinedUserId;
    });
    
    if (!alreadyDeclined) {
      // Add new decline with timestamp
      declinedList.push({
        userId: declinedUserId,
        declinedAt: Date.now()
      });
    }
    
    // Update current user's declined_users_as_dating in database
    const updateResponse = await fetch(
      `${getPocketBaseUrl()}/api/collections/users/records/${currentUserId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ declined_users_as_dating: declinedList }),
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update dating declined list:', {
        status: updateResponse.status,
        error: errorText
      });
      throw new Error(`Failed to update dating declined list: ${updateResponse.status} ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Dating decline operation failed:', error);
    throw error;
  }
};

/**
 * Get matches (mutual likes)
 * Now supports separate dating and partner matches
 * Users with both intents enabled can have TWO separate matches
 * IMPROVED: Symmetric decline check ensures both users agree on no-match
 */
export const getMatches = async (token: string, currentUserId: string): Promise<Match[]> => {
  try {
    const allUsers = await getAllAccounts(token);
    const currentUser = allUsers.find(u => u.id === currentUserId);
    if (!currentUser) return [];

    const currentUserLikedDating = currentUser.liked_users_dating || [];
    const currentUserLikedPartner = currentUser.liked_users_partner || [];
    
    // Get ACTIVE declined lists (not expired)
    const currentUserDeclinedDating = getActiveDeclinedUserIds(currentUser.declined_users_as_dating || [], 'dating');
    const currentUserDeclinedPartner = getActiveDeclinedUserIds(currentUser.declined_users_as_partner || [], 'partner');
    
    // Get current user's blocked users (handle both string and object formats)
    const currentUserBlockedUsers = (currentUser.blocked_users || []).map((item: any) => {
      if (typeof item === 'object' && item !== null && item.id) {
        return item.id;
      }
      return String(item);
    }).filter(Boolean);
    
    const currentUserIntent = Array.isArray(currentUser.intent) ? currentUser.intent : [currentUser.intent];

    const matchesMap: Record<string, Match> = {};
    const matchedUserIds: Set<string> = new Set();

    for (const user of allUsers) {
      if (user.id === currentUserId) continue;
      
      // Skip if either user has blocked the other
      const userBlockedUsers = (user.blocked_users || []).map((item: any) => {
        if (typeof item === 'object' && item !== null && item.id) {
          return item.id;
        }
        return String(item);
      }).filter(Boolean);
      
      if (currentUserBlockedUsers.includes(user.id) || userBlockedUsers.includes(currentUserId)) {
        continue;
      }
      
      const userLikedDating = user.liked_users_dating || [];
      const userLikedPartner = user.liked_users_partner || [];
      
      // Get ACTIVE declined lists for the other user
      const userDeclinedDating = getActiveDeclinedUserIds(user.declined_users_as_dating || [], 'dating');
      const userDeclinedPartner = getActiveDeclinedUserIds(user.declined_users_as_partner || [], 'partner');
      
      const userIntent = Array.isArray(user.intent) ? user.intent : [user.intent];

      // Check for DATING match (with symmetric decline check)
      if (
        currentUserIntent.includes('date') &&
        userIntent.includes('date') &&
        currentUserLikedDating.includes(user.id) &&
        userLikedDating.includes(currentUserId) &&
        !currentUserDeclinedDating.includes(user.id) && // Current user hasn't declined this user
        !userDeclinedDating.includes(currentUserId)     // Other user hasn't declined current user
      ) {
        // Normalize climbing_styles and preserve images array
        const climbing_styles = typeof user.climbing_styles === 'string'
          ? JSON.parse(user.climbing_styles)
          : user.climbing_styles || [];
        const baseUrl = getPocketBaseUrl();
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

      // Check for PARTNER match (with symmetric decline check)
      if (
        currentUserIntent.includes('partner') &&
        userIntent.includes('partner') &&
        currentUserLikedPartner.includes(user.id) &&
        userLikedPartner.includes(currentUserId) &&
        !currentUserDeclinedPartner.includes(user.id) && // Current user hasn't declined this user
        !userDeclinedPartner.includes(currentUserId)     // Other user hasn't declined current user (SYMMETRIC CHECK)
      ) {
        // Normalize climbing_styles and preserve images array
        const climbing_styles = typeof user.climbing_styles === 'string'
          ? JSON.parse(user.climbing_styles)
          : user.climbing_styles || [];
        const baseUrl = getPocketBaseUrl();
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
        `${getPocketBaseUrl()}/api/collections/users/records/${currentUserId}`,
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
        `${getPocketBaseUrl()}/api/collections/users/records/${targetUserId}`,
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
    
    // TODO: Once match records collection exists in PocketBase, mark match status as 'unmatched' with timestamp
    // This will enable match history, re-matching detection, and chronological sorting
  } catch (error) {
    console.error('Failed to unmatch user:', error);
    throw error;
  }
};

/**
 * TODO: Create match record when mutual like happens
 * Structure: { user1Id, user2Id, type: 'dating'|'partner', matchedAt, status: 'active' }
 * Will enable: chronological sorting, match history, re-match prevention, real-time sync
 */
export const createMatchRecord = async (user1Id: string, user2Id: string, matchType: 'dating' | 'partner', token: string): Promise<void> => {
  // Implementation pending: matches collection setup in PocketBase
};

/**
 * TODO: Mark match as unmatched (soft delete)
 * Updates match status to 'unmatched' instead of deleting for tracking purposes
 */
export const markMatchAsUnmatched = async (matchId: string, token: string): Promise<void> => {
  // Implementation pending: matches collection setup in PocketBase
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
