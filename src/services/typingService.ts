import PocketBase from 'pocketbase/cjs';
import EventSource from 'react-native-sse';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';

const POCKETBASE_URL = getPocketBaseUrl();

const globalWithEventSource = globalThis as typeof globalThis & { EventSource?: any };

if (!globalWithEventSource.EventSource) {
  globalWithEventSource.EventSource = EventSource;
}

type TypingStatusRecord = {
  id: string;
  sender_id: string;
  receiver_id: string;
  is_typing: boolean;
  expires_at?: string | null;
  created: string;
  updated: string;
};

export class TypingService {
  private pb: PocketBase;

  constructor(token?: string) {
    this.pb = new PocketBase(POCKETBASE_URL);
    if (token) this.setToken(token);
  }

  setToken(token: string) {
    try {
      const raw = token.split('.')[1];
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
      const payload = JSON.parse(atob(padded));
      this.pb.authStore.save(token, { id: payload.id || payload.sub || '' });
    } catch {
      this.pb.authStore.save(token, { id: '' });
    }
  }

  private getTypingExpiresAt(isTyping: boolean, ttlMs: number): string | null {
    if (!isTyping) {
      return new Date().toISOString();
    }

    return new Date(Date.now() + ttlMs).toISOString();
  }

  async setTyping(senderId: string, receiverId: string, isTyping: boolean, ttlMs = 6000) {
    const expiresAt = this.getTypingExpiresAt(isTyping, ttlMs);
    const data = {
      sender_id: senderId,
      receiver_id: receiverId,
      is_typing: isTyping,
      expires_at: expiresAt,
    };

    try {
      const existing = await this.pb.collection('typing_status').getFirstListItem(
        `sender_id = "${senderId}" && receiver_id = "${receiverId}"`,
        { requestKey: `typing_status:${senderId}:${receiverId}` }
      );

      await this.pb.collection('typing_status').update(existing.id, data);
    } catch (error) {
      await this.pb.collection('typing_status').create(data);
    }
  }

  async subscribeToTyping(
    senderId: string,
    receiverId: string,
    callback: (record: TypingStatusRecord) => void
  ): Promise<() => Promise<void>> {
    const filter = `sender_id = "${senderId}" && receiver_id = "${receiverId}"`;

    const unsubscribe = await this.pb.collection('typing_status').subscribe('*', (event: any) => {
      callback(event.record as TypingStatusRecord);
    }, { filter });

    return async () => {
      await unsubscribe();
    };
  }
}

export const typingService = new TypingService();
