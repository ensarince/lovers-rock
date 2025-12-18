import { Climber } from '@/src/types/climber';

export interface Match {
  id: string;
  climber: Climber;
  matchedAt: number;
  messagePreview?: string;
  unreadCount: number;
}

/**
 * Simulate API that returns matches (climbers who accepted you back)
 */
export const getMatches = async (): Promise<Match[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock: simulate some matches from the 5 climbers
      // In real app, backend would return mutual accepts
      const mockMatches: Match[] = [
        {
          id: '1-match',
          climber: {
            id: '1',
            name: 'Alex Rivera',
            age: 28,
            grade: 'advanced',
            climbing_styles: ['sport', 'outdoor'],
            home_gym: 'Red Rock Climbing Co.',
            bio: 'Weekend warrior obsessed with outdoor crags. Always up for road trips to test new routes!',
            image_url:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          },
          matchedAt: Date.now() - 86400000, // 1 day ago
          messagePreview: 'Hey! I love outdoor climbing too 🧗',
          unreadCount: 2,
        },
        {
          id: '3-match',
          climber: {
            id: '3',
            name: 'Maya Patel',
            age: 31,
            grade: 'advanced',
            climbing_styles: ['trad', 'sport', 'outdoor'],
            home_gym: 'Stone Summit',
            bio: 'Trad climbing enthusiast from Colorado. Love exploring new areas and meeting fellow climbers.',
            image_url:
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
          },
          matchedAt: Date.now() - 3600000, // 1 hour ago
          messagePreview: 'Colorado has some amazing climbing!',
          unreadCount: 0,
        },
      ];

      resolve(mockMatches);
    }, 300);
  });
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
