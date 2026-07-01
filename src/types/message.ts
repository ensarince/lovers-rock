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
  message_type?: 'text' | 'image' | 'gif';
  image_attachment?: string; // PocketBase filename (for message_type === 'image')
  attachment_url?: string;   // Giphy CDN URL (for message_type === 'gif')
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
