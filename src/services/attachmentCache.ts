import { Directory, File, Paths } from 'expo-file-system';
import { isSealedAttachment, openAttachment } from './encryptionService';

// Photos arrive from the server sealed, and <Image> cannot render sealed bytes.
// So each one is downloaded once, opened with the conversation key, and written
// to the cache directory. The component then renders the local file.
//
// Decrypted photos live in the cache directory on purpose: the OS reclaims it
// under storage pressure, and it is excluded from device backups.

const CACHE_DIR_NAME = 'take-attachments';

const cacheDir = () => new Directory(Paths.cache, CACHE_DIR_NAME);

// In-flight requests, so a re-render mid-download does not start a second one.
const pending = new Map<string, Promise<string | null>>();

const ensureCacheDir = (): Directory => {
  const dir = cacheDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

// Message ids are unique and immutable, so the message id plus the stored
// filename identifies the photo for as long as it exists.
const cacheNameFor = (messageId: string, filename: string) =>
  `${messageId}-${filename}`.replace(/[^a-zA-Z0-9.\-]/g, '_');

const download = async (url: string): Promise<Uint8Array | null> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

/**
 * Returns a local file:// URI for a photo attachment, ready to hand to <Image>.
 *
 * Returns null when the photo is sealed and we do not hold the key, which is the
 * expected outcome after a reinstall or a phone switch. Callers show a
 * "not available" tile for null.
 */
export const getAttachmentUri = async (
  messageId: string,
  filename: string,
  remoteUrl: string,
  conversationKey: Uint8Array | null
): Promise<string | null> => {
  const cacheName = cacheNameFor(messageId, filename);
  const inFlight = pending.get(cacheName);
  if (inFlight) return inFlight;

  const task = (async (): Promise<string | null> => {
    try {
      const dir = ensureCacheDir();
      const cached = new File(dir, cacheName);
      if (cached.exists) return cached.uri;

      const raw = await download(remoteUrl);
      if (!raw) return null;

      // Photos sent before attachment encryption are plain, and openAttachment
      // hands those back untouched.
      if (isSealedAttachment(raw) && !conversationKey) return null;
      const opened = openAttachment(raw, conversationKey);
      if (!opened) return null;

      cached.create({ overwrite: true });
      cached.write(opened);
      return cached.uri;
    } catch {
      return null;
    } finally {
      pending.delete(cacheName);
    }
  })();

  pending.set(cacheName, task);
  return task;
};

/**
 * Drops every decrypted photo from disk. Called on logout so the next person to
 * use the phone cannot browse the previous account's pictures straight out of
 * the cache directory.
 */
export const clearAttachmentCache = (): void => {
  try {
    const dir = cacheDir();
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to clear, or the OS already reclaimed it.
  }
};
