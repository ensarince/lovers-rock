import { Climber } from '@/src/types/climber';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

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
  return data.items as Climber[];
}
