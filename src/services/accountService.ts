import { createDefaultGrade } from '@/src/services/gradeService';
import { Climber } from '@/src/types/climber';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';

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
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/users/records`,
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
  // PocketBase returns { items: [...] }
  return data.items.map((item: any) => ({
    ...item,
    grade: parseGrade(item.grade),
    blocked_users: Array.isArray(item.blocked_users) ? item.blocked_users : [],
  })) as Climber[];
}
