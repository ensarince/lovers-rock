import { randomBytes } from 'crypto';

// In-memory stand-in for the device Keychain.
const mockSecureStorage = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  getItemAsync: jest.fn(async (key: string) => mockSecureStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStorage.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStorage.delete(key);
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
}));


import { x25519 } from '@noble/curves/ed25519.js';

const storeKeyFor = (id: string) => `take_e2ee_secret_key_v1_${id}`;
const ALICE = 'alice1234567890';
const BOB = 'bob09876543210a';

// The module caches the device key in memory, so a fresh copy is loaded per test.
const loadService = () => require('@/src/services/encryptionService');

// A peer whose keys live outside the module under test.
const makePeer = () => {
  const secretKey = new Uint8Array(randomBytes(32));
  return {
    secretKey,
    publicKeyB64: Buffer.from(x25519.getPublicKey(secretKey)).toString('base64'),
  };
};

describe('encryptionService', () => {
  let svc: any;

  beforeEach(() => {
    mockSecureStorage.clear();
    jest.resetModules();
    svc = loadService();
  });

  describe('key pair', () => {
    it('creates and persists a key pair on first call', async () => {
      const publicKey = await svc.ensureKeyPair(ALICE);
      expect(publicKey).toBeTruthy();
      expect(Buffer.from(publicKey, 'base64')).toHaveLength(32);
      expect(mockSecureStorage.size).toBe(1);
    });

    it('returns the same public key on later calls', async () => {
      const first = await svc.ensureKeyPair(ALICE);
      jest.resetModules();
      const second = await loadService().ensureKeyPair(ALICE);
      expect(second).toBe(first);
    });

    it('never syncs the secret key off the device', async () => {
      await svc.ensureKeyPair(ALICE);
      // resetModules() hands the service a fresh copy of the mock, so assert
      // against that copy rather than the one imported at the top of the file.
      const store = require('expo-secure-store');
      expect(store.setItemAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { keychainAccessible: 'whenUnlockedThisDeviceOnly' }
      );
    });

    it('wipes the secret key on account deletion', async () => {
      await svc.ensureKeyPair(ALICE);
      await svc.deleteKeyPair(ALICE);
      expect(mockSecureStorage.size).toBe(0);
    });
  });

  // Two people can share a phone. Each account must get its own key, and one
  // signing out must never hand its key to the next one in.
  describe('accounts sharing a device', () => {
    it('gives each account a separate key', async () => {
      const aliceKey = await svc.ensureKeyPair(ALICE);
      const bobKey = await svc.ensureKeyPair(BOB);
      expect(aliceKey).not.toBe(bobKey);
      expect(mockSecureStorage.size).toBe(2);
    });

    it('keeps each account key under its own storage slot', async () => {
      await svc.ensureKeyPair(ALICE);
      await svc.ensureKeyPair(BOB);
      expect(mockSecureStorage.has(storeKeyFor(ALICE))).toBe(true);
      expect(mockSecureStorage.has(storeKeyFor(BOB))).toBe(true);
    });

    it('does not hand one account the other account key', async () => {
      const aliceKey = await svc.ensureKeyPair(ALICE);
      svc.clearKeyCache();
      const bobKey = await svc.ensureKeyPair(BOB);
      expect(bobKey).not.toBe(aliceKey);
    });

    it('survives a logout so history stays readable on sign-in', async () => {
      const before = await svc.ensureKeyPair(ALICE);
      svc.clearKeyCache(); // what logout does
      const after = await svc.ensureKeyPair(ALICE);
      expect(after).toBe(before);
      expect(mockSecureStorage.size).toBe(1);
    });

    it('deleting one account leaves the other key intact', async () => {
      await svc.ensureKeyPair(ALICE);
      const bobKey = await svc.ensureKeyPair(BOB);
      await svc.deleteKeyPair(ALICE);
      expect(mockSecureStorage.has(storeKeyFor(ALICE))).toBe(false);
      expect(await svc.ensureKeyPair(BOB)).toBe(bobKey);
    });

    it('derives different conversation keys for different accounts', async () => {
      const peer = makePeer();
      await svc.ensureKeyPair(ALICE);
      await svc.ensureKeyPair(BOB);
      const asAlice = await svc.getConversationKey(ALICE, 'peer12345678901', peer.publicKeyB64);
      const asBob = await svc.getConversationKey(BOB, 'peer12345678901', peer.publicKeyB64);
      expect(Buffer.from(asBob)).not.toEqual(Buffer.from(asAlice));
    });
  });

  describe('conversation key', () => {
    it('derives the identical key on both sides of the exchange', async () => {
      const myPublicKey = await svc.ensureKeyPair(ALICE);
      const bob = makePeer();

      const mine = await svc.getConversationKey(ALICE, BOB, bob.publicKeyB64);

      // Re-derive from the other side, using a second instance of the service
      // loaded with Bob's secret key.
      jest.resetModules();
      mockSecureStorage.clear();
      mockSecureStorage.set(storeKeyFor(BOB), Buffer.from(bob.secretKey).toString('base64'));
      const theirs = await loadService().getConversationKey(BOB, ALICE, myPublicKey);

      expect(mine).not.toBeNull();
      expect(theirs).not.toBeNull();
      expect(Buffer.from(theirs)).toEqual(Buffer.from(mine));
    });

    it('returns null when the peer has published no key yet', async () => {
      await svc.ensureKeyPair(ALICE);
      expect(await svc.getConversationKey(ALICE, BOB, null)).toBeNull();
      expect(await svc.getConversationKey(ALICE, BOB, '')).toBeNull();
    });

    it('returns null when this device has no key of its own', async () => {
      expect(await svc.getConversationKey(ALICE, BOB, makePeer().publicKeyB64)).toBeNull();
    });

    it('rejects a malformed peer key instead of throwing', async () => {
      await svc.ensureKeyPair(ALICE);
      expect(await svc.getConversationKey(ALICE, BOB, 'dG9vLXNob3J0')).toBeNull();
    });
  });

  describe('sealing messages', () => {
    let key: Uint8Array;

    beforeEach(async () => {
      await svc.ensureKeyPair(ALICE);
      key = await svc.getConversationKey(ALICE, BOB, makePeer().publicKeyB64);
    });

    it('round-trips plain text', () => {
      const message = 'boulderwerk at 18:00?';
      expect(svc.decrypt(svc.encrypt(message, key), key)).toBe(message);
    });

    it('round-trips Turkish characters and emoji', () => {
      const message = 'cok iyi olur, guzel seyler 🧗 ışığı ğüşç';
      expect(svc.decrypt(svc.encrypt(message, key), key)).toBe(message);
    });

    it('round-trips an empty string', () => {
      expect(svc.decrypt(svc.encrypt('', key), key)).toBe('');
    });

    it('round-trips a message longer than one base64 chunk', () => {
      const message = 'x'.repeat(50000);
      expect(svc.decrypt(svc.encrypt(message, key), key)).toBe(message);
    });

    it('leaves no readable plaintext on the wire', () => {
      const sealed = svc.encrypt('meet me at the crag', key);
      expect(sealed).not.toContain('crag');
      expect(sealed.startsWith('v1.')).toBe(true);
      expect(sealed.split('.')).toHaveLength(3);
    });

    it('uses a fresh nonce every time', () => {
      const seen = new Set(
        Array.from({ length: 200 }, () => svc.encrypt('same text', key))
      );
      expect(seen.size).toBe(200);
    });

    it('cannot be opened with a stranger key', () => {
      const sealed = svc.encrypt('private', key);
      expect(svc.decrypt(sealed, new Uint8Array(randomBytes(32)))).toBeNull();
    });

    it('rejects tampered ciphertext', () => {
      const sealed = svc.encrypt('transfer 100 euros', key);
      expect(svc.decrypt(sealed.slice(0, -6) + 'AAAAAA', key)).toBeNull();
    });

    it('rejects a malformed payload instead of throwing', () => {
      expect(svc.decrypt('not-a-payload', key)).toBeNull();
      expect(svc.decrypt('v1.only-two-parts', key)).toBeNull();
      expect(svc.decrypt('v9.aaa.bbb', key)).toBeNull();
    });
  });

  describe('sealing photo attachments', () => {
    // Real JPEG magic, so the tests prove a plain image is never mistaken for a
    // sealed one and vice versa.
    const jpegBytes = (size = 4096) => {
      const data = new Uint8Array(size);
      data.set([0xff, 0xd8, 0xff, 0xe0], 0);
      for (let i = 4; i < size; i += 1) data[i] = i % 256;
      return data;
    };

    let key: Uint8Array;

    beforeEach(async () => {
      await svc.ensureKeyPair(ALICE);
      key = await svc.getConversationKey(ALICE, BOB, makePeer().publicKeyB64);
    });

    it('round-trips the exact bytes', () => {
      const original = jpegBytes();
      const opened = svc.openAttachment(svc.sealAttachment(original, key), key);
      expect(Buffer.from(opened)).toEqual(Buffer.from(original));
    });

    it('round-trips a 2MB photo, the upload cap', () => {
      const original = jpegBytes(2 * 1024 * 1024);
      const opened = svc.openAttachment(svc.sealAttachment(original, key), key);
      // Compare by digest — a deep buffer equality on 2MB takes jest ~30s to diff.
      const digest = (b: Uint8Array) =>
        require('crypto').createHash('sha256').update(Buffer.from(b)).digest('hex');
      expect(opened).toHaveLength(original.length);
      expect(digest(opened)).toBe(digest(original));
    });

    it('leaves the image header unrecognisable', () => {
      const sealed = svc.sealAttachment(jpegBytes(), key);
      // Not a JPEG any more, so PocketBase cannot sniff it as an image.
      expect([sealed[0], sealed[1], sealed[2]]).not.toEqual([0xff, 0xd8, 0xff]);
    });

    it('adds only 45 bytes of overhead', () => {
      const original = jpegBytes(10000);
      expect(svc.sealAttachment(original, key).length).toBe(original.length + 45);
    });

    it('uses a fresh nonce every time', () => {
      const original = jpegBytes(64);
      const a = Buffer.from(svc.sealAttachment(original, key)).toString('hex');
      const b = Buffer.from(svc.sealAttachment(original, key)).toString('hex');
      expect(a).not.toBe(b);
    });

    it('cannot be opened with a stranger key', () => {
      const sealed = svc.sealAttachment(jpegBytes(), key);
      expect(svc.openAttachment(sealed, new Uint8Array(randomBytes(32)))).toBeNull();
    });

    it('rejects tampered bytes', () => {
      const sealed = svc.sealAttachment(jpegBytes(), key);
      sealed[sealed.length - 1] ^= 0xff;
      expect(svc.openAttachment(sealed, key)).toBeNull();
    });

    it('returns null for a sealed photo when no key is available', () => {
      expect(svc.openAttachment(svc.sealAttachment(jpegBytes(), key), null)).toBeNull();
    });

    it('passes a plain image through untouched', () => {
      const plain = jpegBytes();
      expect(Buffer.from(svc.openAttachment(plain, key))).toEqual(Buffer.from(plain));
    });

    it('passes a plain image through even with no key', () => {
      const plain = jpegBytes();
      expect(Buffer.from(svc.openAttachment(plain, null))).toEqual(Buffer.from(plain));
    });

    it('recognises sealed bytes and only sealed bytes', () => {
      expect(svc.isSealedAttachment(svc.sealAttachment(jpegBytes(), key))).toBe(true);
      expect(svc.isSealedAttachment(jpegBytes())).toBe(false);
      expect(svc.isSealedAttachment(new Uint8Array([0x54, 0x41]))).toBe(false);
      expect(svc.isSealedAttachment(new Uint8Array(0))).toBe(false);
    });
  });

  describe('isEncrypted', () => {
    it('recognises sealed payloads', async () => {
      await svc.ensureKeyPair(ALICE);
      const key = await svc.getConversationKey(ALICE, BOB, makePeer().publicKeyB64);
      expect(svc.isEncrypted(svc.encrypt('hi', key))).toBe(true);
    });

    it('treats legacy plaintext as unencrypted', () => {
      expect(svc.isEncrypted('an old message from before encryption')).toBe(false);
      expect(svc.isEncrypted('')).toBe(false);
      expect(svc.isEncrypted(null)).toBe(false);
      expect(svc.isEncrypted(undefined)).toBe(false);
    });
  });

  describe('decryptForDisplay', () => {
    const PLACEHOLDER = 'Message not available on this device';
    let key: Uint8Array;

    beforeEach(async () => {
      await svc.ensureKeyPair(ALICE);
      key = await svc.getConversationKey(ALICE, BOB, makePeer().publicKeyB64);
    });

    it('passes legacy plaintext straight through', () => {
      expect(svc.decryptForDisplay('old plain message', key)).toBe('old plain message');
    });

    it('passes legacy plaintext through even with no key', () => {
      expect(svc.decryptForDisplay('old plain message', null)).toBe('old plain message');
    });

    it('opens a sealed message', () => {
      expect(svc.decryptForDisplay(svc.encrypt('hello', key), key)).toBe('hello');
    });

    it('shows the placeholder for a message sealed to a lost key', () => {
      const sealed = svc.encrypt('hello', key);
      expect(svc.decryptForDisplay(sealed, new Uint8Array(randomBytes(32)))).toBe(PLACEHOLDER);
    });

    it('shows the placeholder when the key could not be derived', () => {
      expect(svc.decryptForDisplay(svc.encrypt('hello', key), null)).toBe(PLACEHOLDER);
    });

    it('returns an empty string for empty input', () => {
      expect(svc.decryptForDisplay('', key)).toBe('');
      expect(svc.decryptForDisplay(null, key)).toBe('');
    });
  });
});
