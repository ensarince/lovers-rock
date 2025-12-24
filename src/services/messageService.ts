import PocketBase from 'pocketbase/cjs';
import { Message } from '../types/message';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export class MessageService {
  private pb: PocketBase;

  constructor(token?: string) {
    this.pb = new PocketBase(POCKETBASE_URL);
    if (token) {
      this.pb.authStore.save(token, null);
    }
  }

  setToken(token: string) {
    this.pb.authStore.save(token, null);
  }

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const data = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim(),
      read: false
    };

    const record = await this.pb.collection('messages').create(data);
    const message: Message = {
      id: record.id,
      sender_id: record.sender_id,
      receiver_id: record.receiver_id,
      content: record.content,
      created: record.created,
      read: record.read
    };
    return message;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string, page = 1, perPage = 50): Promise<Message[]> {
    const records = await this.pb.collection('messages').getList(page, perPage, {
      filter: `((sender_id = "${userId1}" && receiver_id = "${userId2}") || (sender_id = "${userId2}" && receiver_id = "${userId1}"))`,
      sort: 'created'
    });

    return records.items.map((record: any) => ({
      id: record.id,
      sender_id: record.sender_id,
      receiver_id: record.receiver_id,
      content: record.content,
      created: record.created,
      read: record.read
    })) as Message[];
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    // Get all unread messages from sender to receiver
    const records = await this.pb.collection('messages').getFullList({
      filter: `sender_id = "${senderId}" && receiver_id = "${receiverId}" && read = false`
    });

    // Update each message individually
    const updatePromises = records.map(record =>
      this.pb.collection('messages').update(record.id, { read: true })
    );

    await Promise.all(updatePromises);
  }

  subscribeToMessages(userId: string, callback: (message: Message) => void) {
    // TODO: Implement real-time subscriptions for React Native
    // EventSource is not available in React Native, so we'll use polling or another approach
    console.log('Real-time subscriptions not implemented for React Native yet');
    return () => {}; // Return empty unsubscribe function
  }

  async getUnreadCount(userId: string): Promise<number> {
    const records = await this.pb.collection('messages').getList(1, 1, {
      filter: `receiver_id = "${userId}" && read = false`
    });

    return records.totalItems;
  }
}

export const messageService = new MessageService();