# Review Request — Step F: Frontend Polish

Ready for Review: YES

## Files changed
1. `package.json` + `package-lock.json` — added `@expo-google-fonts/cormorant-garamond`, `@expo-google-fonts/josefin-sans`, `expo-haptics`
2. `app/_layout.tsx` — added font imports + 4 font variants to `useFonts()`
3. `src/components/SwipeableCard.tsx` — F1 fonts (name/gym/badge), F2 haptics (swipe + button press), F4 card polish (gradient height, panel opacity, shadow, border), F5 button scale micro-animations
4. `src/components/MatchAnimation.tsx` — F1 fonts (matchText/subText/closeText), F2 haptics (success notification), F5 ripple animation + Continue button scale
5. `src/components/SkeletonLoader.tsx` — NEW: three variants (SkeletonCard, SkeletonRow, SkeletonProfile) with opacity pulse
6. `app/(tabs)/discover.tsx` — F3: SkeletonCard instead of ActivityIndicator
7. `app/(tabs)/matches.tsx` — F3: SkeletonRow count=5 instead of ActivityIndicator
8. `app/(tabs)/messages.tsx` — F3: SkeletonRow count=5 instead of ActivityIndicator
9. `app/(tabs)/profile.tsx` — F3: SkeletonProfile instead of ActivityIndicator
10. `app/(auth)/login.tsx` — F1: CormorantGaramond_700Bold on app title

## Approach rationale
- **Cormorant Garamond + Josefin Sans**: editorial serif for hero text (names, match title, app title), geometric sans for UI chrome (gym, badges, button labels). Creates a romantic/refined contrast appropriate for the app.
- **Haptics**: `ImpactFeedbackStyle.Medium` on accept (positive, emphatic), `Light` on reject (dismissive), `NotificationFeedbackType.Success` on match (celebratory).
- **Skeleton loaders**: opacity pulse (0.35 → 0.75 → 0.35, 900ms each) is lighter/cheaper than a shimmer translate — no layout thrashing. Three semantic variants so each screen gets the right shape.
- **Card polish**: gradient height 28% → 45% ensures readability on any photo; panel opacity 0.52 → 0.78 for same reason; thin accent border (rgba(255,46,99,0.15)) subtly brands each card.
- **Ripple + button scale**: celebratory ripple (200px circle scaling 0→2.8, opacity 0.35→0) fires simultaneously with modal entrance for visual delight; button spring sequence (scale 0.85→1) gives tactile press feedback without blocking the action.

## Self-review Q&A
1. **Font loading race?** Fonts load before SplashScreen hides (same `useFonts` guard). If font family is unavailable, RN falls back to system font — no crash.
2. **Haptics on Android?** `expo-haptics` no-ops gracefully if the device doesn't support the feedback style.
3. **`ActivityIndicator` still imported in profile.tsx?** Yes — it's still used in the save button and unblock button inline spinners. Only the full-screen loading state was replaced.
4. **Tests?** 63/63 green, no source logic changed.
