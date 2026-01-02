export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created: string;
  read: boolean;
}

export interface Conversation {
  matchId: string;
  climber: {
    id: string;
    name: string;
    avatar?: string;
    image_url?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  matchType: 'dating' | 'partner';
}