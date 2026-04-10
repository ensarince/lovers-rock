# Architect Brief — Step F: Frontend Polish (5 items)

## Objective
Elevate the app's visual/tactile quality across 5 identified gaps from the FRONTEND.MD skill audit.

---

## F1 — Custom Fonts

**Font pair chosen:**
- **Display**: `Cormorant Garamond` (SemiBold 600 + Bold 700) — ultra-elegant editorial serif, perfect for the romantic/adventure context. Applied to card names, "It's a Match!" headline, auth app title.
- **UI**: `Josefin Sans` (Regular 400 + SemiBold 600) — geometric, slightly art-deco, clean. Applied to gym names, screen tab labels, badge text, button labels.

**Install:**
```
npx expo install @expo-google-fonts/cormorant-garamond @expo-google-fonts/josefin-sans
```

**Changes:**
- `app/_layout.tsx` — add both font packages to `useFonts()` call
- `src/components/SwipeableCard.tsx` — `name` style: `fontFamily: 'CormorantGaramond_600SemiBold'`; `gym` + `badgeText`: `fontFamily: 'JosefinSans_400Regular'`
- `src/components/MatchAnimation.tsx` — `matchText`: `fontFamily: 'CormorantGaramond_700Bold'`, fontSize 42; `subText` + `closeText`: `fontFamily: 'JosefinSans_600SemiBold'`
- `app/(auth)/login.tsx` — app title text: `fontFamily: 'CormorantGaramond_700Bold'`

---

## F2 — Haptic Feedback

**Install:**
```
npx expo install expo-haptics
```

**Changes:**
- `src/components/SwipeableCard.tsx`:
  - Import `* as Haptics from 'expo-haptics'`
  - In `onPanResponderRelease` when `dx > threshold` (accept): add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
  - In `onPanResponderRelease` when `dx < -threshold` (reject): add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`
  - Accept button `onPress`: add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
  - Reject button `onPress`: add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`
- `src/components/MatchAnimation.tsx`:
  - Import `* as Haptics from 'expo-haptics'`
  - When `visible` becomes true (inside the `if (visible)` block): add `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`

---

## F3 — Skeleton Loaders

Create `src/components/SkeletonLoader.tsx`:
- Uses `Animated` opacity pulse (loop 0.4 → 1 → 0.4, duration 900ms each way)
- Export three variants: `SkeletonCard`, `SkeletonRow`, `SkeletonProfile`
- Uses `theme.colors.surface` as base color, slightly lighter shade for highlight
- `SkeletonCard`: full-width rounded rect matching card height (~350px)
- `SkeletonRow`: accepts `count` prop, renders rows with avatar circle + two line bars
- `SkeletonProfile`: two image blocks + several text line bars

**Changes (replace ActivityIndicator loading states):**
- `app/(tabs)/discover.tsx` — replace `<ActivityIndicator .../>` loading block with `<SkeletonCard />`
- `app/(tabs)/matches.tsx` — replace `<ActivityIndicator .../>` with `<SkeletonRow count={4} />`
- `app/(tabs)/messages.tsx` — replace `<ActivityIndicator .../>` with `<SkeletonRow count={4} />`
- `app/(tabs)/profile.tsx` — replace `<ActivityIndicator .../>` with `<SkeletonProfile />`

---

## F4 — Card Polish

**Changes to `src/components/SwipeableCard.tsx`:**
- `gradientOverlay` height: `'28%'` → `'45%'` (stronger gradient pull)
- `contentPanel` backgroundColor: `'rgba(24,24,28,0.52)'` → `'rgba(8,8,10,0.78)'`
- `contentPanel` paddingTop: `14` → `18`, paddingBottom: `16` → `20`
- `name` fontSize: `20` → `22`, add `letterSpacing: 0.3`
- `cardShadow` shadowOpacity: `0.18` → `0.38`, shadowRadius: `16` → `24`, elevation: `8` → `16`
- `card` style: add `borderWidth: 1, borderColor: 'rgba(255,46,99,0.15)'`

---

## F5 — Micro-animations on Like/Match

**Changes to `src/components/SwipeableCard.tsx`:**
- Add `acceptScale` and `rejectScale` as `useRef(new Animated.Value(1)).current`
- On accept button `onPress`: run `Animated.sequence([Animated.spring(acceptScale, { toValue: 0.85, useNativeDriver: true, tension: 300 }), Animated.spring(acceptScale, { toValue: 1, useNativeDriver: true, tension: 200 })])`
- On reject button `onPress`: same pattern with `rejectScale`
- Wrap accept button `Pressable` in `<Animated.View style={{ transform: [{ scale: acceptScale }] }}>`
- Wrap reject button `Pressable` in `<Animated.View style={{ transform: [{ scale: rejectScale }] }}>`

**Changes to `src/components/MatchAnimation.tsx`:**
- Add `rippleScale` and `rippleOpacity` `Animated.Value` refs
- When visible: run a ripple: scale 0 → 2.5 over 800ms + opacity 0.3 → 0, simultaneously with modal entrance
- Add a `<Animated.View style={[styles.ripple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />` positioned absolutely behind modal
- Add `buttonScale` ref; Continue button: spring 0.92 → 1 on press, wrap in `<Animated.View>`

---

## Handoff
Bob: implement F1 through F5 in order. F1 (install + fonts) must be done before font references in other files. All other items are independent.
