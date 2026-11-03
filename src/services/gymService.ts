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

export interface GymMapPin {
  type: 'gym';
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  climbers: number;
}

export interface GymMapCluster {
  type: 'cluster';
  id: string;
  latitude: number;
  longitude: number;
  gyms: number;
  climbers: number;
}

export type GymMapItem = GymMapPin | GymMapCluster;

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Gym pins and cluster bubbles for the visible part of the map. The server does
 * the clustering, so this stays small at any zoom.
 *
 * Throws on failure (unlike suggestions): the map screen shows a retry state
 * rather than pretending there are no gyms anywhere.
 */
export const getGymMap = async (
  bounds: MapBounds,
  zoom: number,
  token: string
): Promise<GymMapItem[]> => {
  const params = new URLSearchParams({
    minLat: bounds.minLat.toFixed(4),
    maxLat: bounds.maxLat.toFixed(4),
    minLon: bounds.minLon.toFixed(4),
    maxLon: bounds.maxLon.toFixed(4),
    zoom: String(Math.round(zoom)),
  });

  const response = await fetch(`${POCKETBASE_URL}/api/gym-map?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Gym map failed (${response.status})`);

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
};

export interface GymClimber {
  id: string;
  name: string;
  age: number;
  gender?: string;
  grade: any;
  climbing_styles: string[];
  home_gym: string;
  other_gyms: string[];
  bio: string;
  verified: boolean;
  images: string[];
  intent: string[];
  /** true: this is their home gym. false: they also climb here. */
  home: boolean;
}

/**
 * The climbers at one gym, for the gym page on the map. Blocks are applied on
 * the server. Throws on failure so the screen can offer a retry.
 */
export const getGymClimbers = async (
  gymId: string,
  token: string
): Promise<{ gym: { id: string; name: string }; you: 'home' | 'also' | null; items: GymClimber[] }> => {
  const response = await fetch(
    `${POCKETBASE_URL}/api/gym-climbers?gym=${encodeURIComponent(gymId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Gym climbers failed (${response.status})`);

  const data = await response.json();
  return {
    gym: data.gym,
    // Whether the person asking climbs here (they are not in items).
    you: data.you === 'home' || data.you === 'also' ? data.you : null,
    items: Array.isArray(data.items) ? data.items : [],
  };
};
