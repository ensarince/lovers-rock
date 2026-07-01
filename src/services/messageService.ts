import PocketBase from 'pocketbase/cjs';
import EventSource from 'react-native-sse';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import { Message } from '../types/message';

const POCKETBASE_URL = getPocketBaseUrl();

// Strip non-alphanumeric chars to prevent filter injection — PocketBase IDs are alphanumeric only
const safeId = (id: string): string => String(id).replace(/[^a-zA-Z0-9]/g, '');

const globalWithEventSource = globalThis as typeof globalThis & { EventSource?: any };

if (!globalWithEventSource.EventSource) {
  globalWithEventSource.EventSource = EventSource;
}

const mapMessageRecord = (record: any): Message => ({
  id: record.id,
  sender_id: record.sender_id,
  receiver_id: record.receiver_id,
  content: record.content,
  created: record.created,
  read: record.read,
  reactions: record.reactions || {},
  message_type: record.message_type || 'text',
  image_attachment: record.image_attachment || undefined,
  attachment_url: record.attachment_url || undefined,
});

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
      message_type: 'text',
      read: false,
      reactions: {}
    };

    const record = await this.pb.collection('messages').create(data);
    return mapMessageRecord(record);
  }

  async sendImageMessage(senderId: string, receiverId: string, imageUri: string): Promise<Message> {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const formData = new FormData();
    formData.append('sender_id', senderId);
    formData.append('receiver_id', receiverId);
    formData.append('content', '');
    formData.append('message_type', 'image');
    formData.append('read', 'false');
    formData.append('reactions', JSON.stringify({}));
    formData.append('image_attachment', { uri: imageUri, name: filename, type: 'image/jpeg' } as any);

    const record = await this.pb.collection('messages').create(formData);
    return mapMessageRecord(record);
  }

  async sendGifMessage(senderId: string, receiverId: string, gifUrl: string): Promise<Message> {
    const record = await this.pb.collection('messages').create({
      sender_id: senderId,
      receiver_id: receiverId,
      content: '',
      message_type: 'gif',
      attachment_url: gifUrl,
      read: false,
      reactions: {},
    });
    return mapMessageRecord(record);
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string, page = 1, perPage = 50): Promise<Message[]> {
    const records = await this.pb.collection('messages').getList(page, perPage, {
      filter: `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`,
      sort: 'created'
    });

    return records.items.map((record: any) => mapMessageRecord(record)) as Message[];
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    // Get all unread messages from sender to receiver
    const records = await this.pb.collection('messages').getFullList({
      filter: `sender_id = "${safeId(senderId)}" && receiver_id = "${safeId(receiverId)}" && read = false`
    });

    if (!records.length) {
      return;
    }

    // Update each message individually
    const updatePromises = records.map(record =>
      this.pb.collection('messages').update(record.id, { read: true })
    );

    await Promise.all(updatePromises);
  }

  async subscribeToConversation(
    userId1: string,
    userId2: string,
    callback: (event: { action: string; message: Message }) => void
  ): Promise<() => Promise<void>> {
    const filter = `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`;

    const unsubscribe = await this.pb.collection('messages').subscribe('*', (event: any) => {
      callback({
        action: event.action,
        message: mapMessageRecord(event.record),
      });
    }, { filter });

    return async () => {
      await unsubscribe();
    };
  }

  async subscribeToIncomingMessages(
    userId: string,
    callback: (message: Message) => void
  ): Promise<() => Promise<void>> {
    const unsubscribe = await this.pb.collection('messages').subscribe(
      '*',
      (event: any) => {
        if (event.action === 'create' && event.record.receiver_id === userId) {
          callback(mapMessageRecord(event.record));
        }
      },
      { filter: `receiver_id = "${safeId(userId)}"` }
    );
    return async () => { await unsubscribe(); };
  }

  async getLastMessage(userId1: string, userId2: string): Promise<Message | null> {
    try {
      const records = await this.pb.collection('messages').getList(1, 1, {
        filter: `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`,
        sort: '-created',
      });
      return records.items.length > 0 ? mapMessageRecord(records.items[0]) : null;
    } catch {
      return null;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const records = await this.pb.collection('messages').getList(1, 1, {
      filter: `receiver_id = "${safeId(userId)}" && read = false`
    });

    return records.totalItems;
  }

  async deleteChat(userId1: string, userId2: string): Promise<void> {
    // Get all messages between the two users
    const records = await this.pb.collection('messages').getFullList({
      filter: `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`
    });

    // Delete each message
    const deletePromises = records.map(record =>
      this.pb.collection('messages').delete(record.id)
    );

    await Promise.all(deletePromises);
  }

  async updateMessageReaction(messageId: string, _userId: string, reaction: string | null): Promise<void> {
    // Always use the authenticated user's own ID as the reaction key — never
    // trust the caller-supplied userId, which could be forged to attribute
    // a reaction to another user.
    const authUserId = this.pb.authStore.record?.id;
    if (!authUserId) throw new Error('Not authenticated');

    try {
      const record = await this.pb.collection('messages').getOne(messageId);
      const reactions = record.reactions || {};

      if (reaction === null || reaction === '') {
        delete reactions[authUserId];
      } else {
        reactions[authUserId] = reaction;
      }

      await this.pb.collection('messages').update(messageId, { reactions });
    } catch (error) {
      if (__DEV__) console.error('Failed to update message reaction:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
