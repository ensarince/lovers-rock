import { Climber } from '../types/climber';

const mockClimbers: Climber[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    age: 28,
    grade: 'advanced',
    climbing_styles: ['sport', 'outdoor'],
    home_gym: 'Red Rock Climbing Co.',
    bio: 'Weekend warrior obsessed with outdoor crags. Always up for road trips to test new routes!',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    name: 'Jordan Chen',
    age: 26,
    grade: 'expert',
    climbing_styles: ['bouldering', 'gym'],
    home_gym: 'The Climbing Wall NYC',
    bio: 'Competitive boulderer by day, trail runner by night. Looking for someone to share the passion!',
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  },
  {
    id: '3',
    name: 'Maya Patel',
    age: 31,
    grade: 'advanced',
    climbing_styles: ['trad', 'sport', 'outdoor'],
    home_gym: 'Stone Summit',
    bio: 'Trad climbing enthusiast from Colorado. Love exploring new areas and meeting fellow climbers.',
    image_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  },
  {
    id: '4',
    name: 'Sam Williams',
    age: 24,
    grade: 'intermediate',
    climbing_styles: ['gym', 'sport'],
    home_gym: 'CrossFit & Climb Phoenix',
    bio: 'New to the climbing scene but absolutely loving it. Hope to improve my skills with supportive partners!',
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  },
  {
    id: '5',
    name: 'Casey Morgan',
    age: 29,
    grade: 'expert',
    climbing_styles: ['speed', 'bouldering'],
    home_gym: 'Vertical Dreams',
    bio: 'Speed climbing coach and boulderer. Always seeking climbing partners for competition prep and fun sessions.',
    image_url: 'https://images.unsplash.com/photo-1534528741775-253ff287f54f?w=400&h=400&fit=crop',
  },
];

/**
 * Simulates fetching climber profiles from an API
 * @returns Promise resolving to an array of Climber objects
 */
export const getClimbers = async (): Promise<Climber[]> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve(mockClimbers);
    }, 300);
  });
};

/**
 * Get a single climber by ID (useful for detail views)
 */
export const getClimberById = async (id: string): Promise<Climber | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const climber = mockClimbers.find((c) => c.id === id);
      resolve(climber || null);
    }, 200);
  });
};
