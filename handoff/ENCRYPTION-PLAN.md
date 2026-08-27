# Encryption Plan — End-to-End Encrypted Messages

---

## Status: text and photos encrypted, not yet run on a device

All six phases plus photo attachments are implemented, with 125 passing tests.
What has **not** happened: running it on a real phone. The crypto is pure JS and
Hermes-compatible by design, but that stays an assumption until the app boots.

**Verified**
- 42 unit tests on encryptionService: round-trip, tamper rejection, nonce
  uniqueness, Turkish characters and emoji, per-account key isolation,
  shared-device safety, and photo sealing up to the 2MB cap
- 20 integration tests proving what reaches the server is ciphertext, that reply
  previews and GIF URLs are sealed, that uploaded photos no longer look like
  images, that the sealed temp file is cleaned up, and that both fallbacks work
- **A live PocketBase run** confirming an encrypted photo uploads successfully,
  downloads byte-identical, decrypts back to the original, is not stored as a
  recognisable JPEG, and that plain JPEGs from old clients are still accepted
- All three migrations applied cleanly against the local database
- Website builds

**Performance** (Node; Hermes will be slower but the same order)
- 2MB photo: 23ms to seal, 20ms to open
- Sealing adds a flat 45 bytes, so the 2MB upload cap is effectively unchanged

**Still to do**
1. Run on a device with two accounts. Send text and a photo both ways
2. Open the PocketBase admin panel and confirm `messages` shows gibberish and
   the stored attachment does not render as an image
3. Settle the rollout question below before building the APK

**Deviations from the plan below**
- Keys are scoped per account (`take_e2ee_secret_key_v1_<userId>`), not per
  device. Two accounts on one phone would otherwise have shared a key, and the
  second to sign in would have published the first one's public key as its own.
- Logout keeps the stored key and clears only the memory cache, so signing back
  in on the same phone still shows history. `deleteKeyPair()` on account deletion
  is the only thing that destroys it.
- `public_key` was added to `/api/nearby-profiles` too, because matches, and so
  the conversation list, are built from that endpoint rather than the view.
- Push notifications vary by `message_type` ("Sent you a photo" / "a GIF" /
  "a message") rather than one fixed string. The type is not encrypted and leaks
  nothing beyond metadata the server already sees.
- Photos were pulled forward from round 2 and are now sealed as raw bytes,
  layout `[5-byte magic][24-byte nonce][ciphertext+tag]`. Raw rather than base64
  so an encrypted photo is only 45 bytes larger than the original.
- `image_attachment` now also accepts `application/octet-stream`, since
  PocketBase sniffs file content and sealed bytes are indistinguishable from
  random. The plain image types stay allowed for the rollout.
- Decrypted photos are cached under the OS cache directory and wiped on logout
  and on account deletion, so the next person on the phone cannot browse them.
- Jest needed `transformIgnorePatterns` extended for `@noble/*`, which ships pure
  ESM with no CJS build. Metro handles it natively.

## The rollout decision, still open

Once the new APK is live, old clients cannot read new clients' messages and will
show the raw `v1.…` string in chat. Either force an app update so everyone moves
at once, or accept a rough week. Worth settling before the build goes out.

---

## Objective
Make chat messages unreadable in PocketBase. Real end-to-end encryption: private keys live
only on the user's device, the server stores ciphertext only. Then surface this in the chat
UI and on the website so users can see and trust it.

**Decisions locked in:**
- Approach: **real E2EE** (not server-side encryption at rest)
- Key backup: **none for now**. Lose the device, lose the history. Recovery phrase is a later option.
- Scope: **text messages, reply previews, GIF URLs, and photo attachments**.

---

## Crypto design

**Per user:** one X25519 key pair, generated on first run after login.
- Private key → `expo-secure-store` (iOS Keychain / Android Keystore). Never leaves the device.
- Public key → `users.public_key`, exposed through the `public_profiles` view.

**Per conversation:** one symmetric key, derived once and cached in memory.
```
shared    = X25519(myPrivateKey, theirPublicKey)     // ECDH, both sides get the same value
convKey   = HKDF-SHA256(shared, salt = sorted(idA, idB), info = "take-chat-v1")
```
Both users derive the identical `convKey` without it ever being transmitted.

**Per message:** XChaCha20-Poly1305 with a fresh random 24-byte nonce.

**Wire format** (a single string, so no schema change on `content`):
```
v1.<base64url nonce>.<base64url ciphertext+tag>
```
No `v1.` prefix means it is a legacy plaintext message. Render it as-is.

**Libraries** (pure JS, audited, Hermes-compatible, no native module, no prebuild):
- `@noble/curves`  → x25519
- `@noble/ciphers` → xchacha20poly1305
- `@noble/hashes`  → hkdf, sha256

Randomness: noble needs `crypto.getRandomValues`. Verify Expo 54 / Hermes provides it;
if not, shim it from `expo-crypto`'s `getRandomBytes` at app entry **before** any crypto call.
This is the first thing to test, everything else depends on it.

### Stated limits (be honest about these, do not oversell)
- **No forward secrecy.** One fixed key per conversation, no Signal-style ratchet. A stolen
  private key exposes that conversation's past messages. Ratcheting is a separate project.
- **No key verification UI.** Users cannot compare safety numbers, so the server could in
  theory hand out a fake public key (MITM). Fixable later with a fingerprint screen.
- **Metadata is not hidden.** Who talks to whom, when, and how often stays visible in the DB.
- **Photos are plaintext in round 1.** Word the UI note accordingly.

---

## Phase 1 — Crypto foundation
**New file:** `src/services/encryptionService.ts`
- `ensureKeyPair()` → read private key from SecureStore, generate + persist if missing, return public key
- `getConversationKey(myId, theirId, theirPublicKey)` → ECDH + HKDF, memoized in a Map
- `encrypt(plaintext, convKey)` → `v1.nonce.ciphertext`
- `decrypt(payload, convKey)` → plaintext, or `null` on auth-tag failure (wrong/rotated key)
- `isEncrypted(str)` → `v1.` prefix check
- `clearKeys()` → wipe on logout

**Test before moving on:** round-trip encrypt/decrypt in the app, and confirm two separately
derived `convKey`s (A→B and B→A) match.

## Phase 2 — Server side
1. **Migration** `add_public_key_to_users` — text field `public_key` on `users`.
2. **Migration** `add_public_key_to_public_profiles` — add `public_key` to the view query and
   its `FieldsList` (see `1790000009_remove_coords_from_public_profiles.js` for the pattern).
3. **`pb_hooks/push_notifications.pb.js`** — drop the content preview. Body becomes
   `"Sent you a message"` always. The server can no longer read the text.
4. No change needed to `users_field_guard.pb.js` — it only blocks `verified`, so users can
   already write their own `public_key`.

Note: `nearby_profiles.pb.js` does **not** need the key. Discover never decrypts anything.

## Phase 3 — Wire into messaging
**`src/context/AuthContext.tsx`** — after login, call `ensureKeyPair()` and PATCH
`users.public_key` if the stored value differs. Call `clearKeys()` on logout.

**`src/services/messageService.ts`** — the choke points:
- `sendMessage` → encrypt `content`, and encrypt `replyToPreview` (currently a plaintext copy
  of the quoted message, so it leaks the whole thing if left alone)
- `sendGifMessage` → encrypt `attachment_url`
- `mapMessageRecord` is **sync** and has no key. Restructure: pass a `convKey` into the read
  paths (`getMessagesBetweenUsers`, `getLastMessage`, `subscribeToConversation`,
  `subscribeToIncomingMessages`) and decrypt there.
- Failed decrypt → render "Message not available on this device" instead of gibberish.

**`app/chat.tsx`** — it already fetches the peer from `public_profiles` at line ~357, so the
public key arrives in a request that happens anyway. Derive the conv key there, hold it in state,
pass it to the service.

## Phase 4 — Conversation list
**`app/(tabs)/messages.tsx`** (~line 215) renders `lastMessage.content`. Needs one conv key per
conversation. Derivation is cheap and cached, so derive per row on load.

**`src/context/AuthContext.tsx`** (~line 148) also fetches a sender profile for incoming-message
handling. Check whether it displays content anywhere; decrypt if so.

## Phase 5 — Trust note in chat
Small lock row at the top of the chat thread: `🔒 Messages are end-to-end encrypted`.
Tappable, opens a short plain-language sheet:
- only you and the person you're chatting with can read these
- not even Take can read them
- **photos are not encrypted yet** (until round 2 ships)
- if you reinstall or switch phones, older messages can't be shown

## Phase 6 — Website
Short encryption section in `website/index.html`, matching the existing voice. Play Store
description is Ensar's job after the new APK ships.

---

## Migration / rollout notes
- **Old messages stay plaintext.** No `v1.` prefix means render as-is. Do not delete user history.
- **Mixed rollout is unavoidable.** Users on the old APK send plaintext; new clients must keep
  rendering it. Users on the new APK send ciphertext that old clients cannot read, they will see
  the raw `v1.…` string. Consider forcing an app update, or accept a rough week.
- **A user with no `public_key` yet** (hasn't opened the new build) cannot receive encrypted
  messages. Fall back to plaintext for that peer until their key appears.
- **Key rotation:** reinstall = new key pair = new public key. Old messages to the old key fail
  the auth tag and hit the "not available on this device" path. This is expected, not a bug.
- `messages.content` is a text field with no max length, so base64 growth (~35%) is fine.

## Definition of done for round 1
Open the PocketBase admin panel, look at the `messages` table, see gibberish. Two test accounts
can still read each other perfectly in the app.
