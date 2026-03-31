import { createDefaultGrade } from '@/src/services/gradeService';
import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl, normalizeIntentValue } from '@/src/utils/helperFunctions';

const POCKETBASE_URL = getPocketBaseUrl();

// Helper to parse grade from PocketBase record
const parseGrade = (grade: any) => {
  if (!grade) return createDefaultGrade();
  if (typeof grade === 'string') {
    try {
      return JSON.parse(grade);
    } catch {
      return createDefaultGrade();
    }
  }
  return grade;
};

// Accept token as an argument instead of importing getAccessToken
export async function getAllAccounts(token: string): Promise<Climber[]> {
  const perPage = 200;
  let page = 1;
  const allItems: any[] = [];

  while (true) {
    const response = await fetch(
      `${POCKETBASE_URL}/api/collections/public_profiles/records?page=${page}&perPage=${perPage}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }

    const data = await response.json();
    allItems.push(...(data.items || []));

    if (!data.totalPages || page >= data.totalPages) {
      break;
    }

    page += 1;
  }

  return allItems.map((item: any) => ({
    ...item,
    email: item.email || '',
    grade: parseGrade(item.grade),
    blocked_users: Array.isArray(item.blocked_users) ? item.blocked_users : [],
    intent: Array.isArray(item.intent)
      ? item.intent.map((value: string) => normalizeIntentValue(value)).filter(Boolean)
      : [],
  })) as Climber[];
}

export async function getPublicProfiles(token: string): Promise<Climber[]> {
  const perPage = 200;
  let page = 1;
  const allItems: any[] = [];

  while (true) {
    const response = await fetch(
      `${POCKETBASE_URL}/api/collections/public_profiles/records?page=${page}&perPage=${perPage}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch public profiles');
    }

    const data = await response.json();
    allItems.push(...(data.items || []));

    if (!data.totalPages || page >= data.totalPages) {
      break;
    }

    page += 1;
  }

  return allItems.map((item: any) => ({
    ...item,
    email: item.email || '',
    grade: parseGrade(item.grade),
    blocked_users: Array.isArray(item.blocked_users) ? item.blocked_users : [],
    intent: Array.isArray(item.intent)
      ? item.intent.map((value: string) => normalizeIntentValue(value)).filter(Boolean)
      : [],
  })) as Climber[];
}

// Fetch a single user by ID
export async function getUserById(userId: string, token: string): Promise<Climber | null> {
  try {
    const response = await fetch(
      `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      // Fallback to public_profiles if users collection is locked down
      const publicResponse = await fetch(
        `${POCKETBASE_URL}/api/collections/public_profiles/records/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!publicResponse.ok) {
        console.error('Failed to fetch user:', userId, response.status);
        return null;
      }

      const userData = await publicResponse.json();
      return {
        ...userData,
        email: userData.email || '',
        grade: parseGrade(userData.grade),
        blocked_users: Array.isArray(userData.blocked_users) ? userData.blocked_users : [],
        intent: Array.isArray(userData.intent)
          ? userData.intent.map((value: string) => normalizeIntentValue(value)).filter(Boolean)
          : [],
      } as Climber;
    }

    const userData = await response.json();
    return {
      ...userData,
      grade: parseGrade(userData.grade),
      blocked_users: Array.isArray(userData.blocked_users) ? userData.blocked_users : [],
      intent: Array.isArray(userData.intent)
        ? userData.intent.map((value: string) => normalizeIntentValue(value)).filter(Boolean)
        : [],
    } as Climber;
  } catch (error: any) {
    console.error('Error fetching user:', userId, error);
    return null;
  }
}

// Fetch data for multiple blocked users
export async function getBlockedUsersData(
  blockedUserIds: string[],
  token: string
): Promise<Record<string, { name: string; avatarId: string | null }>> {
  const dataMap: Record<string, { name: string; avatarId: string | null }> = {};

  if (!blockedUserIds || blockedUserIds.length === 0) {
    return dataMap;
  }

  // Clean and validate blocked user IDs
  const validIds = blockedUserIds.filter((id) => {
    // Extract id from object if needed
    if (typeof id === 'object' && id !== null && (id as any).id) {
      return true;
    }
    // Only keep strings that look like valid IDs (not empty, not containing spaces)
    return typeof id === 'string' && id.trim().length > 0;
  }).map((id) => {
    // Extract id from object if it's an object
    if (typeof id === 'object' && id !== null && (id as any).id) {
      return (id as any).id;
    }
    return String(id).trim();
  });

  // Fetch all user data in parallel
  const fetchPromises = validIds.map(async (userId) => {
    const user = await getUserById(userId, token);
    if (user) {
      const avatarId =
        user.images && Array.isArray(user.images) && user.images.length > 0
          ? user.images[0]
          : user.avatar || null;

      dataMap[userId] = {
        name: user.name || 'Unknown User',
        avatarId,
      };
    } else {
      // Still add entry but with fallback so it doesn't appear as "loading"
      dataMap[userId] = {
        name: 'Unknown User',
        avatarId: null,
      };
    }
  });

  await Promise.all(fetchPromises);
  return dataMap;
}
