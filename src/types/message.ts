export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created: string;
  read: boolean;
  reactions?: {
    [userId: string]: string; // emoji reactions
  };
}

export interface Conversation {
  matchId: string;
  climber: {
    id: string;
    name: string;
    images?: string[];
    avatar?: string; // Legacy field
    image_url?: string; // Legacy field
  };
  lastMessage?: Message;
  unreadCount: number;
  matchType: 'dating' | 'partner';
}