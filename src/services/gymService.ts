import { getPocketBaseUrl } from '@/src/utils/helperFunctions';

const POCKETBASE_URL = getPocketBaseUrl();

export interface GymSuggestion {
  name: string;
  count: number;
}

/**
 * Gym names other climbers have already entered, most used first.
 *
 * An empty query returns the most popular gyms, which is what someone filling in
 * their profile for the first time wants to see.
 *
 * Suggestions are a convenience, never a blocker: any failure resolves to an empty
 * list so the field keeps behaving like the plain text input it has always been.
 */
export const getGymSuggestions = async (
  query: string,
  token: string
): Promise<GymSuggestion[]> => {
  if (!token) return [];

  try {
    const response = await fetch(
      `${POCKETBASE_URL}/api/gym-suggestions?q=${encodeURIComponent(query.trim())}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
};
