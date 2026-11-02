# Map Plan — Seeing Climbers at a Global Scale

## The problem worth solving

"Open a map and see climbers globally." The real want underneath it: *where is this
community active, and is anyone near me or near a crag I am travelling to.*

That is worth building. The obvious implementation is not.

## Why the obvious version is dangerous

This is a dating app. A map of where individual users are is a stalking tool, and
the people most at risk are exactly the people the app most needs to protect.

The codebase already decided this. Migration `1790000009` stripped `latitude`,
`longitude` and `last_location_update` out of the `public_profiles` view with the
note *"Raw coordinates must not be queryable by arbitrary authenticated users."*
`/api/nearby-profiles` computes distance server-side and returns `distance_km`
only. That was a deliberate hardening pass and a map must not quietly undo it.

Two specifics:

- **Stored precision is ~111m.** `locationService` rounds to 3 decimals. That is
  coarse enough for a distance readout and far too fine for a pin: 111m in a
  residential area is one building.
- **Trilateration works even without coordinates.** An attacker who can move and
  read a distance three times can solve for an exact position. Grindr shipped this
  bug and it exposed users in countries where being outed is a physical danger. Any
  map that reveals more than the current distance filter widens that hole.

Location updates also run every 30s, so anything built on live position is
effectively a live tracker.

## The reframe

**Climbers are not the interesting thing to map. Gyms and crags are.**

Nobody wants a pin on a stranger's flat. What people actually want is "Boulderwerk
has 14 climbers on here" and "there are 30 climbers around Fontainebleau". That is
the same discovery value with none of the exposure, because a gym is a public place
someone *chose* to publish, not where they are standing right now.

`home_gym` is already in `public_profiles`. Users typed it themselves. The gym
autocomplete shipped in `7215a3d` is what makes it aggregatable — before that,
"Bw", "bw" and "boulderwerk" were three gyms.

---

## Recommended build

### Phase 1 — A `gyms` collection

Free-text `home_gym` cannot anchor a map: it has no coordinates and still drifts.

New collection: `id`, `name`, `aliases[]`, `latitude`, `longitude`, `country`,
`climber_count` (denormalised), `created_by`, `verified`.

- Seed from the distinct `home_gym` values already in the database
- Geocode each once, by hand or by script; there are tens of gyms, not thousands
- `aliases[]` absorbs the existing fragmentation ("Bw" → Boulderwerk) — this is
  the proper fix for the Known Gap that autocomplete only stopped from growing
- Point `GymInput` at these records so new entries resolve to a real gym

This is worth doing even if the map is never built.

### Phase 2 — The map, gym pins only

`GET /api/gym-map?bbox=` returns gyms with a climber count. No user records, no
coordinates for people, nothing that identifies anyone.

Zoomed out, cluster by country or region. Zoomed in, individual gym pins with
counts. This is the "global scale" view.

### Phase 3 — Gym detail

Tap a pin: gym name, how many climbers, and the ones who list it as home gym,
using the existing profile card. Every field shown is already public via
`public_profiles`, so this adds no new exposure — it is a new way into data the
discover feed already serves.

Filter by grade and style, reusing the discover filters.

### Phase 4 — "I climb here too"

Let someone add a gym they climb at beyond their single `home_gym`. Turns the map
from a directory into something people appear in on purpose.

---

## What NOT to build, and why

**Individual user pins.** Even opt-in, even jittered. A jittered pin plus a few
observations over time averages back to the true position, and an opt-in toggle
puts the consequences on the person least able to judge them. If it is ever built
it must be: explicit opt-in, snapped to a *gym*, never a live position, and never
finer than the gym itself.

**A live "who is climbing now" layer.** Attractive, and the sharpest possible
stalking tool: it answers "is this person out right now" and "where". If session
posts (already on the roadmap) ever get a map, it should show the *session's* gym
and time, not the participants' positions.

**A heatmap of live positions.** Safer than pins but still derived from where
people sleep, since that is where phones spend most of their time. If it is wanted
later, aggregate server-side into cells no smaller than ~25km, return counts only,
and suppress any cell below a threshold (say 5) so a lone user in a rural area is
not a single dot on their own house.

---

## Technical notes

**A map needs a native module**, which has a real consequence: every feature
shipped so far this session is pure JS and can go out over EAS Update. A map
cannot. It needs a full store build, and older installs will not have it.

- `react-native-maps` — mature, Google Maps on Android, needs an API key and a
  dev build
- `expo-maps` — newer, first-party, less battle-tested
- Either way `expo-dev-client` is already installed, so the dev loop works

**Clustering must be server-side.** Do not ship every gym to the client and cluster
in JS; that stops working the moment the data is interesting.

**Geocoding once, not per request.** Store coordinates on the gym record. Never
geocode a user's typed string at read time.

**`climber_count` should be denormalised** and refreshed by a hook on user update,
not counted live per pin.

---

## Honest assessment of scope

Phase 1 is a real piece of work with lasting value and no map required. Phases 2–3
are the feature as asked, minus the danger. Phase 4 is polish.

This is bigger than anything else on the roadmap right now, and it lands on a live
app whose last release is still being verified. Worth finishing the encryption
rollout first.

## Open decisions

1. Gym-centric only, or is a coarse regional heatmap wanted too?
2. Which map library — and is a store-only feature acceptable given no OTA?
3. Who may add or edit gyms: anyone, or admin-verified to stop junk pins?
