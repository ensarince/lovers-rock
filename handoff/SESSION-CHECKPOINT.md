# Session Checkpoint — 2026-04-15

## What Was Resolved This Session

Google OAuth signup/login is now **working end-to-end** (commit `8f05684`).

---

## What's Working Now

| Thing | Status |
|---|---|
| Email/password auth | ✅ Working |
| Google OAuth (signup + login) | ✅ Working |
| SSE fix (Railway Nginx buffering) | ✅ Working |
| Auth routing (_layout.tsx) | ✅ Fixed |
| Intent default for OAuth users | ✅ Fixed (ProfileCompletionModal) |
| Profile completion modal | ✅ Working |

---

## How Google OAuth Works Now

PocketBase's `authWithOAuth2` with `urlCallback` relies on SSE to deliver the auth code. Railway's proxy caps SSE at ~3 minutes. The new approach bypasses SSE:

1. `listAuthMethods()` → get `provider.authUrl` + `provider.codeVerifier` + `provider.state`
2. Append `redirect_uri = https://.../api/mobile-oauth-callback` to `authUrl`
   - Do NOT add `state` — it's already in `authUrl`
3. `openAuthSessionAsync(authUrl, 'loversrock://oauth')` opens Chrome Custom Tabs
4. Google → Railway `/api/mobile-oauth-callback` → 302 `loversrock://oauth?code=xxx&state=yyy`
5. Custom Tab detects `loversrock://` → auto-closes → `result.url` has the code
6. `authWithOAuth2Code('google', code, codeVerifier, relayUri)` exchanges directly

**Google Cloud Console:** Authorized redirect URI = `https://lovers-rock-production.up.railway.app/api/mobile-oauth-callback`

---

## Railway Setup (Must Redo on Every Redeploy — No Persistent Volume)

1. Railway → PocketBase service → wait for deploy
2. Go to `/_/` → create superuser
3. Collections → `users` → Settings → Auth providers → enable Google (paste Client ID + Secret)
4. Google OAuth config: redirect URI = `https://lovers-rock-production.up.railway.app/api/mobile-oauth-callback`

**TODO: Add a persistent volume** to avoid losing config on every redeploy.
Railway → PocketBase service → Storage → Add Volume → mount path: `/pb/pb_data`

---

## What's Next

- [ ] Add Railway persistent volume (stops losing superuser + Google config on redeploy)
- [ ] Test full new user flow: Google signup → ProfileCompletionModal → discover screen
- [ ] Test returning user: Google login → lands on discover/profile (not profile completion)
- [ ] New EAS build when ready to ship (`eas build --platform android --profile preview`)
- [ ] Typing indicators — `typingService.ts` exists but not integrated in chat UI
- [ ] Message reactions & read receipts — schema exists, visual UI missing
</content>
</invoke>