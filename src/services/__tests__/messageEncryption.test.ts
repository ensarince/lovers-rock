import { randomBytes } from 'crypto';

// A stand-in PocketBase that keeps whatever the app writes, so tests can inspect
// exactly what would land in the real database.
const mockServerRecords: any[] = [];

jest.mock('pocketbase/cjs', () => {
  class FakePocketBase {
    authStore = { token: '', save: jest.fn() };

    collection() {
      return {
        create: jest.fn(async (data: any) => {
          const record = { id: `rec${mockServerRecords.length}`, created: new Date(0).toISOString(), ...data };
          mockServerRecords.push(record);
          return record;
        }),
        getList: jest.fn(async () => ({
          items: [...mockServerRecords].reverse(),
          totalItems: mockServerRecords.length,
        })),
        getFullList: jest.fn(async () => [...mockServerRecords]),
        getOne: jest.fn(async (id: string) => mockServerRecords.find((r) => r.id === id)),
        update: jest.fn(),
        delete: jest.fn(),
        subscribe: jest.fn().mockResolvedValue(() => Promise.resolve()),
        unsubscribe: jest.fn(),
        getFirstListItem: jest.fn(),
      };
    }
  }
  return { __esModule: true, default: FakePocketBase };
});

jest.mock('react-native-sse', () => ({ __esModule: true, default: class {} }));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    getItemAsync: async (k: string) => store.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => { store.set(k, v); },
    deleteItemAsync: async (k: string) => { store.delete(k); },
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
}));

// In-memory filesystem, so tests can read back exactly what was written to disk
// before upload.
const mockDisk = new Map<string, Uint8Array>();

jest.mock('expo-file-system', () => {
  class FakeFile {
    uri: string;
    constructor(...parts: any[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p?.uri ?? '')).join('/');
    }
    get exists() { return mockDisk.has(this.uri); }
    async bytes() { return mockDisk.get(this.uri) ?? new Uint8Array(0); }
    create() { /* nothing to allocate in memory */ }
    write(data: Uint8Array) { mockDisk.set(this.uri, data); }
    delete() { mockDisk.delete(this.uri); }
  }
  return { File: FakeFile, Directory: FakeFile, Paths: { cache: 'file:///cache' } };
});

import { MessageService } from '@/src/services/messageService';
import { ensureKeyPair, getConversationKey } from '@/src/services/encryptionService';
import { x25519 } from '@noble/curves/ed25519.js';

const ME = 'me00000000000ab';
const THEM = 'them0000000000a';

const SECRET = 'meet me at the crag at six, boulderwerk after';

describe('messages as stored on the server', () => {
  let service: MessageService;
  let conversationKey: Uint8Array | null;

  beforeEach(async () => {
    mockServerRecords.length = 0;
    service = new MessageService();

    // Our own key pair, plus a peer whose secret half lives only in this test.
    await ensureKeyPair(ME);
    const peerSecret = new Uint8Array(randomBytes(32));
    const peerPublic = Buffer.from(x25519.getPublicKey(peerSecret)).toString('base64');
    conversationKey = await getConversationKey(ME, THEM, peerPublic);
  });

  it('derives a usable conversation key for the test setup', () => {
    expect(conversationKey).not.toBeNull();
  });

  describe('a sent text message', () => {
    beforeEach(async () => {
      await service.sendMessage(ME, THEM, SECRET, undefined, undefined, conversationKey);
    });

    it('stores no readable trace of the message', () => {
      const stored = JSON.stringify(mockServerRecords);
      expect(stored).not.toContain('crag');
      expect(stored).not.toContain('boulderwerk');
      expect(stored).not.toContain(SECRET);
    });

    it('stores it in the sealed wire format', () => {
      expect(mockServerRecords[0].content).toMatch(/^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    });

    it('still stores the routing metadata the server needs', () => {
      expect(mockServerRecords[0].sender_id).toBe(ME);
      expect(mockServerRecords[0].receiver_id).toBe(THEM);
      expect(mockServerRecords[0].message_type).toBe('text');
    });

    it('reads back as the original text with the key', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, conversationKey);
      expect(message.content).toBe(SECRET);
    });

    it('reads back as a placeholder without the key', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, null);
      expect(message.content).toBe('Message not available on this device');
    });
  });

  describe('a reply', () => {
    beforeEach(async () => {
      await service.sendMessage(ME, THEM, 'yes', 'rec0', SECRET, conversationKey);
    });

    it('seals the quoted preview too, not just the new text', () => {
      expect(JSON.stringify(mockServerRecords)).not.toContain('crag');
      expect(mockServerRecords[0].reply_to_preview).toMatch(/^v1\./);
    });

    it('keeps the reply target id readable, since it is only an id', () => {
      expect(mockServerRecords[0].reply_to_id).toBe('rec0');
    });

    it('reads the quoted preview back intact', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, conversationKey);
      expect(message.reply_to_preview).toBe(SECRET);
    });
  });

  describe('a GIF', () => {
    const GIF_URL = 'https://media.giphy.com/media/abc123/giphy.gif';

    beforeEach(async () => {
      await service.sendGifMessage(ME, THEM, GIF_URL, conversationKey);
    });

    it('seals the URL, since the choice of GIF says plenty', () => {
      expect(JSON.stringify(mockServerRecords)).not.toContain('giphy.com');
      expect(mockServerRecords[0].attachment_url).toMatch(/^v1\./);
    });

    it('reads the URL back intact', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, conversationKey);
      expect(message.attachment_url).toBe(GIF_URL);
    });
  });

  // During rollout, the other person may not have published a key yet. Sending
  // plaintext is the deliberate fallback, so it must keep working.
  describe('when the recipient has published no key', () => {
    beforeEach(async () => {
      await service.sendMessage(ME, THEM, SECRET, undefined, undefined, null);
    });

    it('sends plaintext rather than failing', () => {
      expect(mockServerRecords[0].content).toBe(SECRET);
    });

    it('reads plaintext back untouched even when a key exists', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, conversationKey);
      expect(message.content).toBe(SECRET);
    });
  });

  describe('a photo', () => {
    const PHOTO_URI = 'file:///tmp/compressed.jpg';
    // Real JPEG magic, so the test proves the uploaded bytes stop looking like one.
    const photoBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0,
      ...Array.from({ length: 5000 }, (_, i) => i % 256),
    ]);

    let uploadedPart: any;
    let uploadedBytes: Uint8Array | undefined;
    let realFormData: any;

    beforeEach(() => {
      mockDisk.clear();
      mockDisk.set(PHOTO_URI, photoBytes);

      // React Native's FormData takes a { uri, name, type } object for file parts.
      // Node's built-in FormData would stringify that, so record the parts instead.
      realFormData = (global as any).FormData;
      (global as any).FormData = class {
        parts: Record<string, any> = {};
        append(name: string, value: any) { this.parts[name] = value; }
      };

      // Photo upload uses raw fetch rather than the SDK, so intercept it there.
      uploadedPart = undefined;
      uploadedBytes = undefined;
      (global as any).fetch = jest.fn(async (_url: string, init: any) => {
        uploadedPart = init.body.parts.image_attachment;
        // Read it here: the sealed temp file is deleted as soon as the upload
        // returns, which is exactly what the cleanup test below asserts.
        uploadedBytes = mockDisk.get(uploadedPart.uri);
        return {
          ok: true,
          json: async () => ({
            id: 'img1',
            image_attachment: 'photo.bin',
            created: new Date(0).toISOString(),
          }),
        };
      });
    });

    afterEach(() => {
      (global as any).FormData = realFormData;
      delete (global as any).fetch;
    });

    it('uploads sealed bytes, not the photo', async () => {
      await service.sendImageMessage(ME, THEM, PHOTO_URI, conversationKey);
      const uploaded = uploadedBytes!;
      expect(uploaded).toBeDefined();
      // No longer a JPEG, so the server cannot recognise or render it.
      expect([uploaded[0], uploaded[1], uploaded[2]]).not.toEqual([0xff, 0xd8, 0xff]);
    });

    it('declares the sealed MIME type the field now allows', async () => {
      await service.sendImageMessage(ME, THEM, PHOTO_URI, conversationKey);
      expect(uploadedPart.type).toBe('application/octet-stream');
    });

    it('adds only 45 bytes over the original photo', async () => {
      await service.sendImageMessage(ME, THEM, PHOTO_URI, conversationKey);
      expect(uploadedBytes!.length).toBe(photoBytes.length + 45);
    });

    it('cleans the sealed temp file off disk afterwards', async () => {
      await service.sendImageMessage(ME, THEM, PHOTO_URI, conversationKey);
      // Only the original photo should be left behind.
      expect([...mockDisk.keys()]).toEqual([PHOTO_URI]);
    });

    it('uploads the plain photo when the recipient has no key', async () => {
      await service.sendImageMessage(ME, THEM, PHOTO_URI, null);
      expect(uploadedPart.uri).toBe(PHOTO_URI);
      expect(uploadedPart.type).toBe('image/jpeg');
    });
  });

  // Messages written before encryption shipped are plain and have no v1. prefix.
  describe('messages predating encryption', () => {
    beforeEach(() => {
      mockServerRecords.push({
        id: 'legacy1',
        sender_id: THEM,
        receiver_id: ME,
        content: 'an old message from before encryption',
        created: new Date(0).toISOString(),
        read: true,
      });
    });

    it('still renders as written', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, conversationKey);
      expect(message.content).toBe('an old message from before encryption');
    });

    it('renders even with no key at all', async () => {
      const [message] = await service.getMessagesBetweenUsers(ME, THEM, 1, 50, null);
      expect(message.content).toBe('an old message from before encryption');
    });
  });
});
