# Build Log — Take!

## Project Status
App is near-complete. Core flows (auth, discover, matches, messages, chat, profile) are working.

## Completed Steps

### Step 1 — Animate typing dots (commit: 1c03e25)
`app/chat.tsx` — three typing indicator dots now bounce in sequence with 150ms stagger using React Native `Animated` API. Loop runs while partner is typing, resets on stop.

### Step 2 — Wire notification triggers (commit: ffe2cce)
- `src/services/notificationService.ts` — added `activeConversationPartnerId` + `setActiveConversationPartnerId`
- `src/services/messageService.ts` — added `subscribeToIncomingMessages`
- `app/chat.tsx` — sets/clears active conversation partner on mount/unmount
- `app/(tabs)/messages.tsx` — real-time subscription; fires message notification only when not in that chat
- `app/(tabs)/discover.tsx` — fires dating match notification on mutual like
- `app/(tabs)/matches.tsx` — fires partner request notification for new requests (not on first load)

### Step 3 — Partner-request-accepted notification
`app/(tabs)/matches.tsx` — added `prevPartnerMatchIdsRef`; detects when new partner matches appear (someone accepted YOUR request) and fires `notifyRequestAccepted`.

### Step 4 — Unit Tests (commit: b825042)
63 tests across 4 suites covering helperFunctions, gradeService, preferenceService, notificationService.

### Step F — Frontend Polish
- **F1 Custom Fonts**: Cormorant Garamond (display serif) + Josefin Sans (geometric UI) loaded in `_layout.tsx`. Applied to card names, match headline, sub-labels, auth title.
- **F2 Haptic Feedback**: `expo-haptics` installed. Medium impact on swipe/button accept, Light on reject, Success notification on match.
- **F3 Skeleton Loaders**: New `src/components/SkeletonLoader.tsx` with 3 variants (SkeletonCard, SkeletonRow, SkeletonProfile). Replaced all full-screen ActivityIndicator loading states in discover, matches, messages, profile.
- **F4 Card Polish**: Gradient height 28%→45%, panel opacity 0.52→0.78, shadow elevated, thin accent border added.
- **F5 Micro-animations**: Button scale spring (0.85→1) in SwipeableCard. Celebratory ripple + Continue button scale in MatchAnimation.

### Step G — End-to-end encrypted chat (commits: 26d9641, fbdf93f, 2b9952d, e0b9fc9, 4b7f9ae)
- `src/services/encryptionService.ts` — X25519 key pair per account, ECDH + HKDF conversation key, XChaCha20-Poly1305 sealing for both text and photo bytes
- `src/services/attachmentCache.ts` — downloads, decrypts and caches photos so `<Image>` has something renderable
- `src/services/messageService.ts` — seals on send, opens on read, across text, replies, GIF URLs and photos
- `Pocketbase/` — `public_key` on users and the public_profiles view, `application/octet-stream` allowed on `image_attachment`, generic push notification bodies
- Chat shows a tappable lock note; website gained a "Your Privacy" section
- 62 tests on the crypto and message paths, plus a live PocketBase run confirming an encrypted photo uploads, downloads byte-identical and decrypts back
- **Not yet run on a real device.** Verify before shipping an APK

### Step H — Home gym autocomplete
- `Pocketbase/pb_hooks/gym_suggestions.pb.js` — `GET /api/gym-suggestions?q=`, groups names case-insensitively and returns the most-used spelling of each
- `src/services/gymService.ts` + `src/components/GymInput.tsx` — debounced suggestions, degrading to a plain text field on any failure
- Wired into profile edit and the profile completion modal

## Remaining Work
- Run the encryption on a device with two accounts, then decide the rollout (force update vs. a rough week for old clients)
- Re-run the EAS Android build; the last one died on a Gradle download timeout on their infrastructure

## Known Gaps (out of scope, log for future)
- Session posts feature (future)
- Gym hubs feature (future)
- Pre-accept icebreaker messages for partner mode — not implemented
- Gym names already stored are still fragmented ("Bw" vs "boulderwerk"); autocomplete stops new drift but merges nothing existing
- Encryption has no forward secrecy and no safety-number UI, and metadata (who talks to whom, and when) stays visible. See `handoff/ENCRYPTION-PLAN.md`
