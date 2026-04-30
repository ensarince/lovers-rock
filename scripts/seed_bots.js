#!/usr/bin/env node
/**
 * Seed 100-200 realistic bot climber profiles into PocketBase.
 *
 * Usage (dev):
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpass node scripts/seed_bots.js
 *
 * Usage (Railway / prod):
 *   POCKETBASE_URL=https://your-app.railway.app \
 *   ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=yourpass \
 *   BOT_COUNT=150 \
 *   node scripts/seed_bots.js
 *
 * Requires Node 18+ (native fetch).
 */

const POCKETBASE_URL = (process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, '');
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BOT_COUNT      = Math.min(500, parseInt(process.env.BOT_COUNT || '150', 10));

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.');
  process.exit(1);
}

// ─── Climbing data pools ───────────────────────────────────────────────────

const FRENCH_GRADES = {
  beginner:     ['4c', '5a', '5b', '5c'],
  intermediate: ['6a', '6a+', '6b', '6b+', '6c'],
  advanced:     ['6c+', '7a', '7a+', '7b'],
  expert:       ['7b+', '7c', '7c+', '8a'],
  elite:        ['8a+', '8b', '8c'],
};

const UIAA_GRADES = {
  beginner:     ['IV', 'V-', 'V', 'V+'],
  intermediate: ['VI-', 'VI', 'VI+', 'VII-'],
  advanced:     ['VII', 'VII+', 'VIII-', 'VIII'],
  expert:       ['VIII+', 'IX-', 'IX'],
  elite:        ['IX+', 'X', 'XI'],
};

// Realistic climbing population distribution
const LEVEL_POOL = [
  ...Array(15).fill('beginner'),
  ...Array(40).fill('intermediate'),
  ...Array(30).fill('advanced'),
  ...Array(12).fill('expert'),
  ...Array(3).fill('elite'),
];

const STYLE_COMBOS = [
  ['bouldering', 'gym'],
  ['bouldering', 'sport'],
  ['sport', 'outdoor'],
  ['bouldering'],
  ['sport'],
  ['trad', 'outdoor'],
  ['bouldering', 'sport', 'gym'],
  ['sport', 'trad'],
  ['gym'],
  ['outdoor', 'sport'],
  ['bouldering', 'outdoor'],
  ['sport', 'gym'],
];

const HOME_GYMS = [
  'Boulderwelt München',
  'Magic Mountain Berlin',
  'DAV Kletterzentrum München',
  'Kletterhalle Frankfurt',
  'Blockhelden Nürnberg',
  'Bloc House Hamburg',
  'Boulder Bande Stuttgart',
  'Rockerei Vienna',
  'Boulderklub Graz',
  'Kletterzentrum Innsbruck',
  'The Arch London',
  'Climbing Hangar Liverpool',
  'Edinburgh International Climbing Arena',
  'Sharma Climbing Barcelona',
  'Vertical Art Lyon',
  'Crux Climbing Centre Amsterdam',
  'Movement Climbing Denver',
  'Brooklyn Boulders NYC',
  'Sender One LA',
  'Earth Treks Washington DC',
  'Austin Bouldering Project',
  'Momentum Climbing Salt Lake City',
  'The Circuit Portland',
  'Mesa Rim San Francisco',
  'Touchstone Berkeley',
];

const LOCATIONS = [
  { city: 'Munich',      lat: 48.137,  lon: 11.576 },
  { city: 'Berlin',      lat: 52.520,  lon: 13.405 },
  { city: 'Frankfurt',   lat: 50.110,  lon:  8.682 },
  { city: 'Hamburg',     lat: 53.551,  lon:  9.993 },
  { city: 'Stuttgart',   lat: 48.775,  lon:  9.181 },
  { city: 'Cologne',     lat: 50.938,  lon:  6.960 },
  { city: 'Innsbruck',   lat: 47.269,  lon: 11.404 },
  { city: 'Vienna',      lat: 48.208,  lon: 16.373 },
  { city: 'Graz',        lat: 47.070,  lon: 15.439 },
  { city: 'Chamonix',    lat: 45.924,  lon:  6.869 },
  { city: 'Lyon',        lat: 45.764,  lon:  4.836 },
  { city: 'Paris',       lat: 48.857,  lon:  2.352 },
  { city: 'London',      lat: 51.508,  lon: -0.128 },
  { city: 'Edinburgh',   lat: 55.953,  lon: -3.188 },
  { city: 'Barcelona',   lat: 41.385,  lon:  2.173 },
  { city: 'Zurich',      lat: 47.377,  lon:  8.541 },
  { city: 'Bern',        lat: 46.948,  lon:  7.447 },
  { city: 'Amsterdam',   lat: 52.373,  lon:  4.890 },
  { city: 'Copenhagen',  lat: 55.676,  lon: 12.568 },
  { city: 'Stockholm',   lat: 59.334,  lon: 18.063 },
];

const MALE_BIOS = [
  "Weekend warrior at the crag, weekday sufferer at the desk. Looking for a partner who doesn't mind long approaches.",
  "Sport climber slowly converting to trad. Send help — and also beta on placing cams.",
  "I project hard routes and barely finish easy ones. Classic.",
  "Bouldering is life. Crimps are my love language.",
  "Train hard, climb harder, stretch never. Currently questioning everything.",
  "Outdoor climbing addict. If the weather's good, I'm not in the city.",
  "Route setter by night, pumped out of my mind by day.",
  "I'll do one more go. Famous last words.",
  "Climbing since university, still can't do a proper hip turn. Send help.",
  "Send train conductor. All aboard, no excuses.",
  "Looking for a belayer who won't sandbag my projects.",
  "Vertical miles are the only miles I care about.",
  "I came for the climbing, I stayed for the suffering.",
  "Footwork is overrated. Said no one good at climbing.",
  "Currently obsessed with crack climbing. My hands disagree.",
  "If there's a roof route, I'm taking the rest day.",
  "Redpoint mentality. I'll work it until it goes.",
  "Alpine dreams on a sport climber's fitness.",
  "The approach IS the workout.",
  "Slab is a character-building experience I didn't ask for.",
];

const FEMALE_BIOS = [
  "Stronger than my grade suggests. Looking for beta, not unsolicited spotting advice.",
  "Bouldering gym regular trying to get outside more. Footwork nerd.",
  "Trad climbing is terrifying and I'm fully addicted. Looking for similarly unhinged partners.",
  "Multi-pitch aspirations. Sandbagging is my cardio.",
  "Project mentality. I'll work a route for months before I'm done.",
  "Campus board avoidant. Core board enthusiast. Balance is key.",
  "Climbing coach and full-time route obsessive.",
  "If there's a crack, I want to be in it.",
  "New to sport climbing but an old soul at the crag.",
  "Looking for a send train that actually departs on time.",
  "I came here for the climbing and also the post-crag food.",
  "Dyno specialist. Static moves are for people with reach.",
  "Read the route, trust your feet, send it.",
  "Small but mighty. Reachy cruxes are my villain origin story.",
  "High-ball bouldering enthusiast. My friends think I'm reckless.",
  "Granite devotee. Limestone is fine I guess.",
  "Trying to climb everything before I get sensible.",
  "Beta by day, send by golden hour.",
  "I love the process — the suffering is part of it.",
  "Rest days are for planning the next project.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function jitter(coord, radius = 0.15) {
  return coord + (Math.random() - 0.5) * radius;
}

function pickGrade() {
  const generalLevel = pick(LEVEL_POOL);
  const useFrench = Math.random() > 0.25; // 75% French, 25% UIAA
  const system = useFrench ? 'french' : 'uiaa';
  const gradeMap = useFrench ? FRENCH_GRADES : UIAA_GRADES;
  const value = pick(gradeMap[generalLevel]);
  return { system, value, general_level: generalLevel };
}

function pickIntent() {
  const r = Math.random();
  if (r < 0.33) return ['date'];
  if (r < 0.60) return ['partner'];
  return ['date', 'partner'];
}

// ─── PocketBase helpers ────────────────────────────────────────────────────

async function adminAuth() {
  // Try new v0.26 superusers endpoint first, fall back to legacy
  for (const endpoint of [
    '/api/collections/_superusers/auth-with-password',
    '/api/admins/auth-with-password',
  ]) {
    try {
      const res = await fetch(`${POCKETBASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Admin authenticated via ${endpoint}`);
        return data.token;
      }
    } catch (_) {}
  }
  throw new Error('Admin authentication failed — check ADMIN_EMAIL and ADMIN_PASSWORD');
}

async function createUser(payload, adminToken) {
  const res = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Create user failed: ${body}`);
  }
  return res.json();
}

async function uploadPhoto(userId, photoUrl, adminToken) {
  try {
    const photoRes = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) });
    if (!photoRes.ok) return;

    const buffer = await photoRes.arrayBuffer();
    const filename = `avatar_${userId}.jpg`;

    const form = new FormData();
    form.append('images', new Blob([buffer], { type: 'image/jpeg' }), filename);

    const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: adminToken },
      body: form,
    });

    if (!patchRes.ok && process.env.VERBOSE) {
      console.warn(`  ⚠ Photo upload failed for ${userId}: ${await patchRes.text()}`);
    }
  } catch (err) {
    if (process.env.VERBOSE) console.warn(`  ⚠ Photo fetch failed: ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTake! Bot Seeder`);
  console.log(`Target: ${POCKETBASE_URL}`);
  console.log(`Count:  ${BOT_COUNT} users\n`);

  const adminToken = await adminAuth();

  // Fetch real user data from randomuser.me (names, photos, age, gender)
  console.log(`Fetching ${BOT_COUNT} user profiles from randomuser.me...`);
  const ruRes = await fetch(
    `https://randomuser.me/api/?results=${BOT_COUNT}&nat=de,at,gb,fr,es,ch,nl,dk,se&inc=name,gender,dob,picture&noinfo`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!ruRes.ok) throw new Error('randomuser.me fetch failed');
  const { results } = await ruRes.json();
  console.log(`✓ Got ${results.length} user templates\n`);

  let created = 0;
  let failed  = 0;

  for (let i = 0; i < results.length; i++) {
    const ru = results[i];

    try {
      const grade    = pickGrade();
      const location = pick(LOCATIONS);
      const intent   = pickIntent();
      const styles   = pick(STYLE_COMBOS);
      const gym      = pick(HOME_GYMS);
      const bio      = ru.gender === 'male' ? pick(MALE_BIOS) : pick(FEMALE_BIOS);
      const age      = Math.max(20, Math.min(42, ru.dob.age));
      const name     = `${ru.name.first} ${ru.name.last}`;

      // Use a unique bot email that won't clash with real users
      const uid = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const email = `bot.${uid}@takeapp.internal`;

      const record = await createUser({
        email,
        password:        'TakeBot2024!',
        passwordConfirm: 'TakeBot2024!',
        name,
        age,
        gender:           ru.gender === 'male' ? 'male' : 'female',
        grade:            JSON.stringify(grade),
        climbing_styles:  JSON.stringify(styles),
        home_gym:         gym,
        bio,
        intent:           JSON.stringify(intent),
        latitude:         jitter(location.lat),
        longitude:        jitter(location.lon),
        profile_completed: true,
        verified:          true,
      }, adminToken);

      // Upload the randomuser.me photo as their profile image
      await uploadPhoto(record.id, ru.picture.large, adminToken);

      created++;
      process.stdout.write(
        `\r[${created + failed}/${results.length}] ✓ ${name.padEnd(22)} ${grade.value.padEnd(5)} ${grade.general_level.padEnd(12)} ${location.city}`
      );

      // Throttle slightly to be kind to both APIs
      await sleep(80);

    } catch (err) {
      failed++;
      if (process.env.VERBOSE) console.error(`\n  ✗ ${err.message}`);
    }
  }

  console.log(`\n\n─────────────────────────────────`);
  console.log(`Done!`);
  console.log(`  Created : ${created}`);
  console.log(`  Failed  : ${failed}`);
  console.log(`─────────────────────────────────`);
  console.log(`\nBot accounts use email: bot.*@takeapp.internal`);
  console.log(`Password for all bots:  TakeBot2024!`);
  console.log(`\nTo delete all bots later, filter by email ~ "takeapp.internal" in PocketBase admin.`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
