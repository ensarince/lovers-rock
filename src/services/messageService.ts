import PocketBase from 'pocketbase/cjs';
import EventSource from 'react-native-sse';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import { Message } from '../types/message';
// Aliased because this module already has a Message "File"-free namespace and
// the bare name File collides with the DOM lib type in TS.
import { File as FileSystemFile, Paths } from 'expo-file-system';
import { decryptForDisplay, encrypt, sealAttachment } from './encryptionService';

const POCKETBASE_URL = getPocketBaseUrl();

// Strip non-alphanumeric chars to prevent filter injection — PocketBase IDs are alphanumeric only
const safeId = (id: string): string => String(id).replace(/[^a-zA-Z0-9]/g, '');

const globalWithEventSource = globalThis as typeof globalThis & { EventSource?: any };

if (!globalWithEventSource.EventSource) {
  globalWithEventSource.EventSource = EventSource;
}

// Text fields are sealed by encryptionService before they leave the device.
// conversationKey is deliberately tri-state:
//   a key    -> open the text for display
//   null     -> we looked and have no key, show the "not available" placeholder
//   omitted  -> leave the text exactly as stored, for callers that resolve the
//               key themselves later (see subscribeToIncomingMessages)
// Messages predating encryption are plain and pass through untouched in all three.
const mapMessageRecord = (record: any, conversationKey?: Uint8Array | null): Message => {
  const open = (value: string | undefined) => {
    if (!value || conversationKey === undefined) return value;
    return decryptForDisplay(value, conversationKey);
  };

  return {
    id: record.id,
    sender_id: record.sender_id,
    receiver_id: record.receiver_id,
    content: open(record.content) ?? '',
    created: record.created,
    read: record.read,
    reactions: record.reactions || {},
    message_type: record.message_type || 'text',
    image_attachment: record.image_attachment || undefined,
    attachment_url: open(record.attachment_url) || undefined,
    reply_to_id: record.reply_to_id || undefined,
    // The quoted copy of another message, so it leaks the same text if left plain.
    reply_to_preview: open(record.reply_to_preview) || undefined,
  };
};

export class MessageService {
  private pb: PocketBase;

  constructor(token?: string) {
    this.pb = new PocketBase(POCKETBASE_URL);
    if (token) this.setToken(token);
  }

  setToken(token: string) {
    try {
      const raw = token.split('.')[1];
      // base64url → base64: replace URL-safe chars and add = padding
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
      const payload = JSON.parse(atob(padded));
      this.pb.authStore.save(token, { id: payload.id || payload.sub || '' });
    } catch {
      this.pb.authStore.save(token, { id: '' });
    }
  }

  // A null conversationKey means the recipient has not published an encryption
  // key yet (they are on an older build), so the message goes out in plaintext.
  // That is the only path that still writes readable text to the server.
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    replyToId?: string,
    replyToPreview?: string,
    conversationKey?: Uint8Array | null
  ): Promise<Message> {
    const trimmed = content.trim();
    const seal = (value: string) =>
      conversationKey ? encrypt(value, conversationKey) : value;

    const data: Record<string, any> = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: seal(trimmed),
      message_type: 'text',
      read: false,
      reactions: {},
    };
    if (replyToId) {
      data.reply_to_id = replyToId;
      data.reply_to_preview = replyToPreview ? seal(replyToPreview) : '';
    }

    const record = await this.pb.collection('messages').create(data);
    return mapMessageRecord(record, conversationKey);
  }

  // With a key, the photo is sealed on this device and what gets uploaded is
  // opaque bytes. Without one, the plain image goes up as it always did, so a
  // recipient still on the old build keeps working.
  async sendImageMessage(
    senderId: string,
    receiverId: string,
    imageUri: string,
    conversationKey?: Uint8Array | null
  ): Promise<Message> {
    let uploadUri = imageUri;
    let filename = imageUri.split('/').pop() || 'photo.jpg';
    let mimeType = 'image/jpeg';
    let sealedFile: FileSystemFile | null = null;

    if (conversationKey) {
      const plain = await new FileSystemFile(imageUri).bytes();
      const sealed = sealAttachment(plain, conversationKey);

      // Multipart uploads take a file path, not a buffer, so the sealed bytes
      // have to land on disk first. Cleaned up in the finally below.
      sealedFile = new FileSystemFile(Paths.cache, `sealed-${Date.now()}.bin`);
      sealedFile.create({ overwrite: true });
      sealedFile.write(sealed);

      uploadUri = sealedFile.uri;
      filename = 'photo.bin';
      // Sealed bytes sniff as octet-stream on the server, which the
      // image_attachment field now allows alongside the plain image types.
      mimeType = 'application/octet-stream';
    }

    try {
      const formData = new FormData();
      formData.append('sender_id', senderId);
      formData.append('receiver_id', receiverId);
      formData.append('content', '');
      formData.append('message_type', 'image');
      formData.append('read', 'false');
      formData.append('reactions', '{}');
      formData.append('image_attachment', { uri: uploadUri, name: filename, type: mimeType } as any);

      // Use raw fetch for multipart uploads — the PocketBase SDK's FormData
      // handling is unreliable in React Native. Raw fetch passes FormData
      // directly to the native networking layer which handles file parts correctly.
      const token = this.pb.authStore.token;
      const response = await fetch(`${POCKETBASE_URL}/api/collections/messages/records`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Upload failed: ${response.status}`);
      }

      const record = await response.json();
      return mapMessageRecord(record, conversationKey);
    } finally {
      try {
        sealedFile?.delete();
      } catch {
        // A leftover file in the cache directory is harmless.
      }
    }
  }

  async sendGifMessage(
    senderId: string,
    receiverId: string,
    gifUrl: string,
    conversationKey?: Uint8Array | null
  ): Promise<Message> {
    const record = await this.pb.collection('messages').create({
      sender_id: senderId,
      receiver_id: receiverId,
      content: '',
      message_type: 'gif',
      // Which GIF someone picked says plenty, so seal the URL too.
      attachment_url: conversationKey ? encrypt(gifUrl, conversationKey) : gifUrl,
      read: false,
      reactions: {},
    });
    return mapMessageRecord(record, conversationKey);
  }

  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    page = 1,
    perPage = 50,
    conversationKey?: Uint8Array | null
  ): Promise<Message[]> {
    // Sort newest-first so page 1 always returns the most recent messages.
    // Callers that display messages use sortMessages() to re-order oldest-first.
    const records = await this.pb.collection('messages').getList(page, perPage, {
      filter: `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`,
      sort: '-created',
      requestKey: null,
    });

    return records.items.map((record: any) =>
      mapMessageRecord(record, conversationKey)
    ) as Message[];
  }

  async getUnreadCountFromSender(senderId: string, receiverId: string): Promise<number> {
    const records = await this.pb.collection('messages').getList(1, 1, {
      filter: `sender_id = "${safeId(senderId)}" && receiver_id = "${safeId(receiverId)}" && read = false`,
      requestKey: null,
    });
    return records.totalItems;
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    // Get all unread messages from sender to receiver
    const records = await this.pb.collection('messages').getFullList({
      filter: `sender_id = "${safeId(senderId)}" && receiver_id = "${safeId(receiverId)}" && read = false`,
      requestKey: null,
    });

    if (!records.length) {
      return;
    }

    // Update each message individually
    const updatePromises = records.map(record =>
      this.pb.collection('messages').update(record.id, { read: true }, { requestKey: null })
    );

    await Promise.all(updatePromises);
  }

  async subscribeToConversation(
    userId1: string,
    userId2: string,
    callback: (event: { action: string; message: Message }) => void,
    conversationKey?: Uint8Array | null
  ): Promise<() => Promise<void>> {
    const filter = `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`;

    const unsubscribe = await this.pb.collection('messages').subscribe('*', (event: any) => {
      callback({
        action: event.action,
        message: mapMessageRecord(event.record, conversationKey),
      });
    }, { filter });

    return async () => {
      await unsubscribe();
    };
  }

  // Fires for messages from *any* sender, so there is no single conversation key
  // to apply here. Content is handed over still sealed and the caller decrypts it
  // once it knows who sent it.
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

  async getLastMessage(
    userId1: string,
    userId2: string,
    conversationKey?: Uint8Array | null
  ): Promise<Message | null> {
    try {
      const records = await this.pb.collection('messages').getList(1, 1, {
        filter: `((sender_id = "${safeId(userId1)}" && receiver_id = "${safeId(userId2)}") || (sender_id = "${safeId(userId2)}" && receiver_id = "${safeId(userId1)}"))`,
        sort: '-created',
        requestKey: null,
      });
      return records.items.length > 0
        ? mapMessageRecord(records.items[0], conversationKey)
        : null;
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

  async updateMessageReaction(messageId: string, userId: string, reaction: string | null): Promise<void> {
    const record = await this.pb.collection('messages').getOne(messageId, { requestKey: null });
    const reactions = { ...(record.reactions || {}) };

    if (reaction === null || reaction === '') {
      delete reactions[userId];
    } else {
      reactions[userId] = reaction;
    }

    await this.pb.collection('messages').update(messageId, { reactions }, { requestKey: null });
  }
}

export const messageService = new MessageService();
