import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { x25519 } from '@noble/curves/ed25519.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

// End-to-end encryption for chat messages.
//
// Each device holds one X25519 secret key that never leaves it. Two users derive
// a shared conversation key from their own secret plus the other's public key
// (ECDH), so the key itself is never transmitted and the server cannot compute it.
// Messages are sealed with XChaCha20-Poly1305 under that conversation key.
//
// Known limits, documented in handoff/ENCRYPTION-PLAN.md:
//   - no forward secrecy (one long-lived key per conversation, no ratchet)
//   - no safety-number UI, so a malicious server could serve a fake public key
//   - metadata (who talks to whom, and when) stays in plain sight
//   - losing the device loses the key, and with it the readable history

// Keys are scoped per account, so two people sharing a phone never inherit each
// other's key, and logging out does not destroy a readable history.
const STORE_PREFIX = 'take_e2ee_secret_key_v1_';
const storeKeyFor = (userId: string) =>
  `${STORE_PREFIX}${String(userId).replace(/[^a-zA-Z0-9]/g, '')}`;

const WIRE_VERSION = 'v1';
const HKDF_INFO = 'take-chat-v1';
const NONCE_BYTES = 24;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------- base64 (Uint8Array <-> string) ----------
// Chunked so a long message can't blow the call stack via fromCharCode.apply.
const CHUNK = 0x2000;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// ---------- key management ----------

// Secret key of the account currently in use, cached so we don't hit the
// Keychain on every message.
let cachedUserId: string | null = null;
let cachedSecretKey: Uint8Array | null = null;

// Conversation keys, cached per owner + peer + peer key, so switching account or
// a peer rotating their key both miss the cache rather than returning a stale one.
const conversationKeys = new Map<string, Uint8Array>();

const loadSecretKey = async (userId: string): Promise<Uint8Array | null> => {
  if (cachedUserId === userId && cachedSecretKey) return cachedSecretKey;

  const stored = await SecureStore.getItemAsync(storeKeyFor(userId));
  if (!stored) return null;

  try {
    const bytes = fromBase64(stored);
    if (bytes.length !== 32) return null;
    cachedUserId = userId;
    cachedSecretKey = bytes;
    return bytes;
  } catch {
    return null;
  }
};

// Creates this account's key pair if it does not exist yet. Returns the base64
// public key, which is safe to publish, or null if secure storage is unavailable.
export const ensureKeyPair = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  try {
    let secretKey = await loadSecretKey(userId);

    if (!secretKey) {
      // Draw entropy from expo-crypto rather than noble's own RNG, which expects
      // a WebCrypto global that Hermes does not reliably provide.
      secretKey = Crypto.getRandomBytes(32);
      await SecureStore.setItemAsync(storeKeyFor(userId), toBase64(secretKey), {
        // Device-only: never sync this key to iCloud or a Google backup.
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      cachedUserId = userId;
      cachedSecretKey = secretKey;
    }

    return toBase64(x25519.getPublicKey(secretKey));
  } catch (error) {
    if (__DEV__) console.error('[e2ee] ensureKeyPair failed:', error);
    return null;
  }
};

// Drops in-memory key material only. Call on logout: the stored key survives, so
// signing back in on the same phone still shows the existing history, while a
// different account signing in cannot reach the previous one's key.
export const clearKeyCache = (): void => {
  cachedUserId = null;
  cachedSecretKey = null;
  conversationKeys.clear();
};

// Permanently destroys this account's key, making its message history
// unreadable forever. Only for account deletion, never for a plain logout.
export const deleteKeyPair = async (userId: string): Promise<void> => {
  clearKeyCache();
  if (!userId) return;
  try {
    await SecureStore.deleteItemAsync(storeKeyFor(userId));
  } catch {
    // Already gone is the outcome we wanted.
  }
};

// ---------- conversation keys ----------

// Derives the symmetric key shared with one peer. Returns null when we have no
// key of our own, or the peer has not published one yet (they're on an older
// build) — callers treat null as "fall back to plaintext for this peer".
export const getConversationKey = async (
  myUserId: string,
  theirUserId: string,
  theirPublicKeyB64: string | null | undefined
): Promise<Uint8Array | null> => {
  if (!myUserId || !theirUserId || !theirPublicKeyB64) return null;

  const cacheKey = `${myUserId}:${theirUserId}:${theirPublicKeyB64}`;
  const cached = conversationKeys.get(cacheKey);
  if (cached) return cached;

  try {
    const secretKey = await loadSecretKey(myUserId);
    if (!secretKey) return null;

    const theirPublicKey = fromBase64(theirPublicKeyB64);
    if (theirPublicKey.length !== 32) return null;

    const shared = x25519.getSharedSecret(secretKey, theirPublicKey);

    // Sorting the IDs makes the salt identical on both sides of the conversation.
    const salt = textEncoder.encode([myUserId, theirUserId].sort().join(':'));
    const key = hkdf(sha256, shared, salt, textEncoder.encode(HKDF_INFO), 32);

    conversationKeys.set(cacheKey, key);
    return key;
  } catch (error) {
    if (__DEV__) console.error('[e2ee] getConversationKey failed:', error);
    return null;
  }
};

// ---------- message sealing ----------

// True for anything this module produced. Everything else is a legacy plaintext
// message from before encryption shipped, and must still render as-is.
export const isEncrypted = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.startsWith(`${WIRE_VERSION}.`);

// Seals text into "v1.<nonce>.<ciphertext>". Throws rather than silently
// returning plaintext, so a broken send can never leak a message to the server.
export const encrypt = (plaintext: string, conversationKey: Uint8Array): string => {
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const sealed = xchacha20poly1305(conversationKey, nonce).encrypt(
    textEncoder.encode(plaintext)
  );
  return `${WIRE_VERSION}.${toBase64(nonce)}.${toBase64(sealed)}`;
};

// Opens a sealed message. Returns null when the payload was sealed for a key we
// no longer hold (reinstall, new phone) or has been tampered with. Callers show
// a "not available on this device" placeholder for null.
export const decrypt = (payload: string, conversationKey: Uint8Array): string | null => {
  const parts = payload.split('.');
  if (parts.length !== 3 || parts[0] !== WIRE_VERSION) return null;

  try {
    const opened = xchacha20poly1305(conversationKey, fromBase64(parts[1])).decrypt(
      fromBase64(parts[2])
    );
    return textDecoder.decode(opened);
  } catch {
    return null;
  }
};

// ---------- attachment sealing ----------

// Photos are sealed as raw bytes rather than base64, so an encrypted photo is
// only 45 bytes larger than the original and still fits the 2MB upload cap.
//
// Layout: [5-byte magic][24-byte nonce][ciphertext + 16-byte tag]
//
// The magic prefix is what tells an encrypted attachment apart from one uploaded
// before encryption shipped. No real image starts with these bytes: JPEG begins
// FF D8 FF and PNG begins 89 50 4E 47.
const ATTACHMENT_MAGIC = new Uint8Array([0x54, 0x41, 0x4b, 0x45, 0x31]); // "TAKE1"
const ATTACHMENT_HEADER = ATTACHMENT_MAGIC.length + NONCE_BYTES;

// True when these bytes were sealed by sealAttachment, false for a plain image.
export const isSealedAttachment = (data: Uint8Array): boolean => {
  if (data.length < ATTACHMENT_HEADER) return false;
  return ATTACHMENT_MAGIC.every((byte, index) => data[index] === byte);
};

export const sealAttachment = (
  data: Uint8Array,
  conversationKey: Uint8Array
): Uint8Array => {
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const sealed = xchacha20poly1305(conversationKey, nonce).encrypt(data);

  const out = new Uint8Array(ATTACHMENT_HEADER + sealed.length);
  out.set(ATTACHMENT_MAGIC, 0);
  out.set(nonce, ATTACHMENT_MAGIC.length);
  out.set(sealed, ATTACHMENT_HEADER);
  return out;
};

// Opens a sealed attachment. Returns null if these bytes were sealed for a key we
// no longer hold, or were tampered with. Plain images are returned untouched, so
// callers can pass anything downloaded from the server straight through.
export const openAttachment = (
  data: Uint8Array,
  conversationKey: Uint8Array | null
): Uint8Array | null => {
  if (!isSealedAttachment(data)) return data;
  if (!conversationKey) return null;

  try {
    const nonce = data.subarray(ATTACHMENT_MAGIC.length, ATTACHMENT_HEADER);
    return xchacha20poly1305(conversationKey, nonce).decrypt(
      data.subarray(ATTACHMENT_HEADER)
    );
  } catch {
    return null;
  }
};

// Convenience wrapper for render paths: legacy plaintext passes straight through,
// sealed text is opened, and anything unreadable becomes the placeholder.
export const decryptForDisplay = (
  value: string | null | undefined,
  conversationKey: Uint8Array | null,
  placeholder = 'Message not available on this device'
): string => {
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  if (!conversationKey) return placeholder;
  return decrypt(value, conversationKey) ?? placeholder;
};
