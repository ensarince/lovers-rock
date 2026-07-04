import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl, intentIncludes, normalizeIntentValue } from '@/src/utils/helperFunctions';
import { Match } from '../types/match';
import { getPublicProfiles, getUserById } from './accountService';
import {
  createDecline,
  createLike,
  getActiveDeclinedUserIds,
  getBlockedAgainstUser,
  getBlockedByUser,
  getIncomingLikes,
  getOutgoingDeclines,
  getOutgoingLikes,
  removeDecline,
  removeLike,
} from './socialGraphService';

const normalizeClimber = (user: Climber): Climber => {
  const climbing_styles = typeof user.climbing_styles === 'string'
    ? JSON.parse(user.climbing_styles)
    : user.climbing_styles || [];
  const baseUrl = getPocketBaseUrl();
  const images = user.images && user.images.length > 0 ? user.images : (user.avatar ? [user.avatar] : []);
  let avatarUrl = '';
  if (images.length > 0) {
    avatarUrl = `${baseUrl}/api/files/users/${user.id}/${images[0]}?thumb=100x100`;
  }

  return {
    ...user,
    climbing_styles,
    images,
    image_url: avatarUrl,
  };
};

const buildProfileMap = (profiles: Climber[]) =>
  new Map(profiles.map((profile) => [profile.id, profile]));

const buildBlockedIdSet = (blockedByMe: Array<{ to_user: string }>, blockedAgainstMe: Array<{ from_user: string }>) =>
  new Set([
    ...blockedByMe.map((record) => record.to_user).filter(Boolean),
    ...blockedAgainstMe.map((record) => record.from_user).filter(Boolean),
  ]);

/**
 * Returns users who have sent a partner request to the current user (i.e., current user's id is in their likes)
 * Filters out users who have been declined by the current user
 */
export const getIncomingPartnerRequests = async (currentUserId: string, token: string): Promise<Climber[]> => {
  const [
    incomingLikes,
    outgoingLikes,
    outgoingDeclines,
    blockedByMe,
    blockedAgainstMe,
    profiles,
  ] = await Promise.all([
    getIncomingLikes(currentUserId, token, 'partner'),
    getOutgoingLikes(currentUserId, token, 'partner'),
    getOutgoingDeclines(currentUserId, token, 'partner'),
    getBlockedByUser(currentUserId, token),
    getBlockedAgainstUser(currentUserId, token),
    getPublicProfiles(token),
  ]);

  const profileMap = buildProfileMap(profiles);
  const blockedIds = buildBlockedIdSet(blockedByMe, blockedAgainstMe);
  const outgoingPartnerLikes = new Set(outgoingLikes.map((like) => like.to_user).filter(Boolean));
  const declinedPartnerIds = new Set(getActiveDeclinedUserIds(outgoingDeclines, 'partner', 'outgoing'));

  const filteredUsers = incomingLikes
    .map((like) => like.from_user)
    .filter(Boolean)
    .filter((userId) => userId !== currentUserId)
    .filter((userId) => !outgoingPartnerLikes.has(userId))
    .filter((userId) => !declinedPartnerIds.has(userId))
    .filter((userId) => !blockedIds.has(userId))
    .map((userId) => profileMap.get(userId))
    .filter(Boolean)
    .filter((user) => intentIncludes((user as Climber).intent, 'partner'))
    .map((user) => normalizeClimber(user as Climber));

  return filteredUsers;
};

/**
 * Accept a partner request (add like for partner intent)
 */
export const acceptPartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  try {
    await createLike(currentUserId, requesterId, 'partner', token);
    await removeDecline(currentUserId, requesterId, 'partner', token);
  } catch (error) {
    if (__DEV__) console.error('âŒ Accept operation failed:', error);
    throw error;
  }
};

/**
 * Decline a partner request (store decline and hide from incoming list)
 */
export const declinePartnerRequest = async (currentUserId: string, requesterId: string, token: string): Promise<void> => {
  try {
    if (!currentUserId || !requesterId || !token) {
      throw new Error('Invalid parameters: currentUserId, requesterId, and token are required');
    }

    if (currentUserId === requesterId) {
      throw new Error('Cannot decline a request from yourself');
    }

    await createDecline(currentUserId, requesterId, 'partner', token);

    // Best-effort: remove incoming like if permissions allow
    try {
      await removeLike(requesterId, currentUserId, 'partner', token);
    } catch (error) {
      if (__DEV__) console.warn('âš ï¸ Could not remove incoming partner like:', error);
    }
  } catch (error) {
    if (__DEV__) console.error('âŒ Partner decline operation failed:', error);
    throw error;
  }
};

/**
 * Decline a dating user (add to declined list with timestamp)
 */
export const declineDatingUser = async (currentUserId: string, declinedUserId: string, token: string): Promise<void> => {
  try {
    if (!currentUserId || !declinedUserId || !token) {
      throw new Error('Invalid parameters: currentUserId, declinedUserId, and token are required');
    }

    if (currentUserId === declinedUserId) {
      throw new Error('Cannot decline yourself');
    }

    await createDecline(currentUserId, declinedUserId, 'dating', token);

    // Best-effort: remove incoming like if permissions allow
    try {
      await removeLike(declinedUserId, currentUserId, 'dating', token);
    } catch (error) {
      if (__DEV__) console.warn('âš ï¸ Could not remove incoming dating like:', error);
    }
  } catch (error) {
    if (__DEV__) console.error('âŒ Dating decline operation failed:', error);
    throw error;
  }
};

/**
 * Get matches (mutual likes)
 */
export const getMatches = async (token: string, currentUserId: string): Promise<Match[]> => {
  try {
    const currentUser = await getUserById(currentUserId, token);
    if (!currentUser) return [];

    const currentUserIntent = (Array.isArray(currentUser.intent) ? currentUser.intent : [currentUser.intent])
      .map((value) => normalizeIntentValue(value))
      .filter(Boolean) as Array<'date' | 'partner'>;

    const [
      outgoingLikes,
      incomingLikes,
      outgoingDeclines,
      blockedByMe,
      blockedAgainstMe,
      profiles,
    ] = await Promise.all([
      getOutgoingLikes(currentUserId, token),
      getIncomingLikes(currentUserId, token),
      getOutgoingDeclines(currentUserId, token),
      getBlockedByUser(currentUserId, token),
      getBlockedAgainstUser(currentUserId, token),
      getPublicProfiles(token),
    ]);

    const profileMap = buildProfileMap(profiles);
    const blockedIds = buildBlockedIdSet(blockedByMe, blockedAgainstMe);

    // Maps from userId → like created timestamp so we can compute the real match time
    const outgoingDating = new Map(outgoingLikes.filter((like) => like.intent === 'dating').map((like) => [like.to_user, like.created]));
    const outgoingPartner = new Map(outgoingLikes.filter((like) => like.intent === 'partner').map((like) => [like.to_user, like.created]));
    const incomingDating = new Map(incomingLikes.filter((like) => like.intent === 'dating').map((like) => [like.from_user, like.created]));
    const incomingPartner = new Map(incomingLikes.filter((like) => like.intent === 'partner').map((like) => [like.from_user, like.created]));

    const declinedByMeDating = new Set(getActiveDeclinedUserIds(outgoingDeclines, 'dating', 'outgoing'));
    const declinedByMePartner = new Set(getActiveDeclinedUserIds(outgoingDeclines, 'partner', 'outgoing'));

    const matchesMap: Record<string, Match> = {};

    const addMatch = (user: Climber, type: 'dating' | 'partner', matchedAt: number) => {
      const matchId = `${user.id}-${type}-match`;
      if (matchesMap[matchId]) return;

      matchesMap[matchId] = {
        id: matchId,
        climber: normalizeClimber(user),
        matchedAt,
        messagePreview: type === 'dating' ? 'You matched! Say hello 🤗' : 'Connected! Say hello 🤗',
        unreadCount: 0,
        type,
      };
    };

    const likeTs = (created?: string) => (created ? new Date(created).getTime() : 0);

    if (currentUserIntent.includes('date')) {
      outgoingDating.forEach((outCreated, userId) => {
        if (!incomingDating.has(userId)) return;
        if (blockedIds.has(userId)) return;
        if (declinedByMeDating.has(userId)) return;
        const user = profileMap.get(userId);
        if (!user) return;
        if (!intentIncludes(user.intent, 'date')) return;
        const matchedAt = Math.max(likeTs(outCreated), likeTs(incomingDating.get(userId)));
        addMatch(user, 'dating', matchedAt || Date.now());
      });
    }

    if (currentUserIntent.includes('partner')) {
      outgoingPartner.forEach((outCreated, userId) => {
        if (!incomingPartner.has(userId)) return;
        if (blockedIds.has(userId)) return;
        if (declinedByMePartner.has(userId)) return;
        const user = profileMap.get(userId);
        if (!user) return;
        if (!intentIncludes(user.intent, 'partner')) return;
        const matchedAt = Math.max(likeTs(outCreated), likeTs(incomingPartner.get(userId)));
        addMatch(user, 'partner', matchedAt || Date.now());
      });
    }

    return Object.values(matchesMap);
  } catch (error) {
    if (__DEV__) console.error('Failed to fetch matches:', error);
    return [];
  }
};

/**
 * Unmatch from a user (remove both users from each other's likes)
 */
export const unmatchUser = async (currentUserId: string, targetUserId: string, matchType: 'dating' | 'partner', token: string): Promise<void> => {
  try {
    await Promise.all([
      removeLike(currentUserId, targetUserId, matchType, token),
      removeLike(targetUserId, currentUserId, matchType, token),
    ]);
  } catch (error) {
    if (__DEV__) console.error('Failed to unmatch user:', error);
    throw error;
  }
};

/**
 * TODO: Create match record when mutual like happens
 */
export const createMatchRecord = async (user1Id: string, user2Id: string, matchType: 'dating' | 'partner', token: string): Promise<void> => {
  // Implementation pending: matches collection setup in PocketBase
};

/**
 * TODO: Mark match as unmatched (soft delete)
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
