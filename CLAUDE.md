# Lovers Rock — Claude Context

## Three Man Team

This project uses a structured three-agent workflow. At the start of every session, adopt a role by reading the corresponding file:

| Role | Prompt |
|------|--------|
| **Arch** (Architect / Lead) | "You are Arch. Read CLAUDE.md, then `.claude/skills/ARCHITECT.md`." |
| **Bob** (Builder / Dev) | "You are Bob. Read `.claude/skills/BUILDER.md`, then `handoff/ARCHITECT-BRIEF.md`." |
| **Richard** (Reviewer) | "You are Richard. Read `.claude/skills/REVIEWER.md`, then `handoff/REVIEW-REQUEST.md`." |

Handoff files live in `handoff/`. Sequence: Arch briefs Bob → Bob builds → Richard reviews → Arch deploys.

### Token Rules
1. Trust existing knowledge — skip redundant file reads
2. Grep before opening files; use offset/limit on large files
3. Run independent tool calls in parallel
4. No restating — do not repeat back what the user just said
5. Out-of-scope discoveries go to `handoff/BUILD-LOG.md` as Known Gaps, never expand the current step

---


## What This App Is
A **climbing community dating & partnership app** for rock climbers. Users can find romantic partners *or* climbing partners based on climbing grade, style, location, and intent.

## Tech Stack
- **Frontend**: React Native 0.81.5 + Expo 54 + Expo Router 6 (file-based routing)
- **Language**: TypeScript
- **Backend**: PocketBase (self-hosted, also on Railway for prod) — DB + auth + real-time SSE
- **State**: React Context (AuthContext) + AsyncStorage + Expo SecureStore
- **Auth**: Email/password + Google OAuth via PocketBase `authWithOAuth2()`
- **Location**: expo-location (periodic updates every 30s, stored on user record)
- **Notifications**: expo-notifications (conditional import — not available in Expo Go)
- **Styling**: Custom theme objects (`themeDark.ts` / `themeLight.ts`), dark mode default

## Project Structure
```
app/
  (auth)/login.tsx          — email + Google sign-in, email verification
  (tabs)/discover.tsx       — swipe/like interface with dating & partner modes
  (tabs)/matches.tsx        — mutual matches + incoming partner requests
  (tabs)/messages.tsx       — conversation list, real-time subscriptions
  (tabs)/profile.tsx        — edit profile, photos, settings modal
  chat.tsx                  — one-on-one messaging screen
  _layout.tsx               — root layout with AuthProvider

src/
  components/               — reusable UI components
  context/AuthContext.tsx   — user state, token mgmt, login/logout, theme, location
  services/                 — auth, messages, matches, preferences, location, notifications, typing, report
  types/                    — Climber, Match, Message, LikeRecord, DeclineRecord, etc.
  utils/                    — helpers
  themeDark.ts / themeLight.ts

Pocketbase/                 — self-hosted backend (pb_migrations/, pb_hooks/, pb_data/)
```

## Core Data Models
- **Climber (users)**: id, name, age, email, bio, gender, grade {system, value, general_level}, climbing_styles[], home_gym, images[] (max 3), intent ('date'|'partner'|both), latitude, longitude, profile_completed, blocked_users[], verified
- **likes**: from_user, to_user, intent ('dating'|'partner'), created
- **declines**: from_user, to_user, intent, declined_at (1-month expiry)
- **blocks**: from_user, to_user
- **reports**: from_user, to_user, reason, description, status
- **messages**: sender_id, receiver_id, content, created, read, reactions{}
- **public_profiles**: filtered public view of user profiles

## Key Architectural Decisions
- **Dual-intent system**: Users can have both 'date' and 'partner' active; likes/declines are per-intent
- **Service layer**: Stateless service files per domain (no class-based services except Notification/Report)
- **Social graph**: Separate PocketBase collections for likes/declines/blocks (not embedded in user record)
- **Decline expiry**: Declined users reappear after 1 month (stored with timestamp)
- **Privacy**: Coordinates rounded to 3 decimals; public_profiles collection filters sensitive data
- **Conditional imports**: expo-notifications imported conditionally; dev mode checks throughout
- **Real-time**: PocketBase SSE subscriptions (not WebSockets) for messages and notifications
- **Image handling**: Max 3 images per user; filenames stored in PocketBase; thumb URL pattern: `{PB_URL}/api/files/users/{userId}/{filename}?thumb=100x100`

## What's Done / Solid
- Auth flow (email + Google, email verification, profile completion modal)
- Discover screen with swipe UI, dating/partner toggle, grade/style/distance filters
- Matches screen with partner request accept/decline
- Messages list + real-time subscriptions
- Chat screen
- Profile edit with image gallery
- Geolocation-based distance filtering (Haversine)
- Block/Report per card and per match
- Settings modal (blocked users, dark mode)
- PocketBase migrations and hooks in place

## What's Incomplete / In Progress
- **Typing indicators**: `typingService.ts` exists, not integrated in chat UI
- **Message reactions & read receipts**: Schema exists, visual UI incomplete
- **Notifications**: Infrastructure in place but reliability needs testing
- **Session posts**: Future feature (post climbing sessions, find participants) — not started
- **Community/Gym hubs**: Future feature — lightweight feed per gym — not started
- **Image attachments in chat**: Schema-ready but not implemented
- **Pre-accept icebreaker messages** for partner mode: not implemented

## PocketBase URLs
- Dev: `http://localhost:8090`
- Prod: Railway deployment

## Conventions
- Theme colors accessed via `theme.X` (passed through context or props)
- Tab screens live in `app/(tabs)/`, auth in `app/(auth)/`
- Services accept `token`/`userId` as params (no global state inside services)
- Grades stored as `{ system: 'french'|'uiaa', value: string, general_level: string }`
