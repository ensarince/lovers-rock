#!/usr/bin/env node
/**
 * Seed 100-200 realistic bot climber profiles into PocketBase.
 * Each bot gets 3 images: 1 face photo + 2 climbing action photos.
 * Location pool: ~50% Turkey, ~35% Germany, ~15% other Europe.
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
  // Turkey
  'Atom Climbing Istanbul',
  'Blok Istanbul',
  'ReachHigh Climbing Istanbul',
  'Ankara Boulder',
  'İzmir Boulder Salonu',
  'Antalya Tırmanma Merkezi',
  'Crux Istanbul',
  'Bursa Bouldering',
  'Eskişehir Climbing Hub',
  'Kadıköy Boulder',
  // Germany
  'Boulderwelt München',
  'Magic Mountain Berlin',
  'DAV Kletterzentrum München',
  'Kletterhalle Frankfurt',
  'Blockhelden Nürnberg',
  'Bloc House Hamburg',
  'Boulder Bande Stuttgart',
  'DAV Kletterhalle Köln',
  'Kletterzentrum Hannover',
  // Other Europe
  'Rockerei Vienna',
  'Kletterzentrum Innsbruck',
  'The Arch London',
  'Sharma Climbing Barcelona',
  'Crux Climbing Centre Amsterdam',
];

// ─── Locations — ~50% Turkey, ~35% Germany, ~15% other ────────────────────

const TR_CITIES = [
  { city: 'Istanbul',    lat: 41.015, lon: 28.979 },
  { city: 'Ankara',      lat: 39.925, lon: 32.866 },
  { city: 'Izmir',       lat: 38.423, lon: 27.143 },
  { city: 'Antalya',     lat: 36.896, lon: 30.713 },
  { city: 'Bursa',       lat: 40.182, lon: 29.061 },
  { city: 'Bodrum',      lat: 37.034, lon: 27.430 },
  { city: 'Eskişehir',   lat: 39.776, lon: 30.520 },
  { city: 'Mersin',      lat: 36.800, lon: 34.641 },
  { city: 'Geyikbayiri', lat: 36.880, lon: 30.530 },
  { city: 'Kapadokya',   lat: 38.643, lon: 34.828 },
];

const DE_CITIES = [
  { city: 'Munich',    lat: 48.137, lon: 11.576 },
  { city: 'Berlin',    lat: 52.520, lon: 13.405 },
  { city: 'Hamburg',   lat: 53.551, lon:  9.993 },
  { city: 'Frankfurt', lat: 50.110, lon:  8.682 },
  { city: 'Stuttgart', lat: 48.775, lon:  9.181 },
  { city: 'Cologne',   lat: 50.938, lon:  6.960 },
  { city: 'Nuremberg', lat: 49.453, lon: 11.077 },
];

const OTHER_CITIES = [
  { city: 'Vienna',    lat: 48.208, lon: 16.373 },
  { city: 'Innsbruck', lat: 47.269, lon: 11.404 },
  { city: 'Zurich',    lat: 47.377, lon:  8.541 },
  { city: 'London',    lat: 51.508, lon: -0.128 },
  { city: 'Barcelona', lat: 41.385, lon:  2.173 },
  { city: 'Amsterdam', lat: 52.373, lon:  4.890 },
];

// TR: 50 entries (~49%), DE: 35 entries (~34%), Other: 18 entries (~17%)
const LOCATIONS = [
  ...Array(5).fill(TR_CITIES).flat(),
  ...Array(5).fill(DE_CITIES).flat(),
  ...Array(3).fill(OTHER_CITIES).flat(),
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

// Loremflickr keyword combos for climbing photos
const CLIMBING_QUERIES = [
  'rock,climbing',
  'bouldering',
  'sport,climbing',
  'climbing,outdoor',
  'climbing,wall',
  'rock+climbing',
  'climbing,mountain',
];

// ─── Helpers ──────────────────────────────────────────────────────────────

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function jitter(coord, radius = 0.15) {
  return coord + (Math.random() - 0.5) * radius;
}

function pickGrade() {
  const generalLevel = pick(LEVEL_POOL);
  const useFrench = Math.random() > 0.25;
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

const usedLocks = new Set();
function getClimbingPhotoUrl() {
  let lock;
  do { lock = Math.floor(Math.random() * 9500) + 500; } while (usedLocks.has(lock));
  usedLocks.add(lock);
  return `https://loremflickr.com/640/640/${pick(CLIMBING_QUERIES)}?lock=${lock}`;
}

// ─── Pre-fetch climbing photos upfront ────────────────────────────────────
// Re-uses a pool of 30 photos across all bots (much faster than fetching per-bot).

async function prefetchClimbingPhotos(count = 30) {
  process.stdout.write(`Pre-fetching ${count} climbing photos`);
  const photos = [];
  const batchSize = 5;

  for (let i = 0; i < count; i += batchSize) {
    const batchCount = Math.min(batchSize, count - i);
    const batch = Array.from({ length: batchCount }, () => getClimbingPhotoUrl());

    const results = await Promise.allSettled(
      batch.map(url =>
        fetch(url, { signal: AbortSignal.timeout(15000) })
          .then(r => r.ok ? r.arrayBuffer() : null)
          .catch(() => null)
      )
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) photos.push(r.value);
    }
    process.stdout.write(`.`);
    await sleep(600);
  }

  console.log(` ${photos.length}/${count} ready\n`);
  return photos;
}

// ─── PocketBase helpers ────────────────────────────────────────────────────

async function adminAuth() {
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

async function uploadPhotos(userId, personPhotoUrl, climbingPool, adminToken) {
  const form = new FormData();
  let uploaded = 0;

  // Image 1: person's face photo
  try {
    const res = await fetch(personPhotoUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      form.append('images', new Blob([await res.arrayBuffer()], { type: 'image/jpeg' }), `img1_${userId}.jpg`);
      uploaded++;
    }
  } catch (_) {}

  // Images 2 & 3: random climbing photos from pre-fetched pool
  if (climbingPool.length >= 2) {
    const shuffled = [...climbingPool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 2; i++) {
      form.append('images', new Blob([shuffled[i]], { type: 'image/jpeg' }), `img${i + 2}_${userId}.jpg`);
      uploaded++;
    }
  }

  if (uploaded === 0) return 0;

  try {
    const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: adminToken },
      body: form,
    });
    if (!patchRes.ok && process.env.VERBOSE) {
      console.warn(`\n  ⚠ Photo upload failed for ${userId}: ${await patchRes.text()}`);
    }
  } catch (err) {
    if (process.env.VERBOSE) console.warn(`\n  ⚠ Photo patch error: ${err.message}`);
  }

  return uploaded;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTake! Bot Seeder`);
  console.log(`Target: ${POCKETBASE_URL}`);
  console.log(`Count:  ${BOT_COUNT} users (3 images each)\n`);

  const adminToken = await adminAuth();

  // Pre-fetch climbing photos before creating any users
  const climbingPool = await prefetchClimbingPhotos(30);
  if (climbingPool.length < 2) {
    console.warn('⚠ Fewer than 2 climbing photos fetched — bots will have fewer images.');
  }

  // Fetch user templates: ~55% Turkish, ~45% European
  const trCount = Math.round(BOT_COUNT * 0.55);
  const euCount = BOT_COUNT - trCount;

  console.log(`Fetching ${trCount} Turkish + ${euCount} European user templates from randomuser.me...`);

  const [trRes, euRes] = await Promise.all([
    fetch(
      `https://randomuser.me/api/?results=${trCount}&nat=tr&inc=name,gender,dob,picture&noinfo`,
      { signal: AbortSignal.timeout(15000) }
    ),
    fetch(
      `https://randomuser.me/api/?results=${euCount}&nat=de,at,gb,fr,es&inc=name,gender,dob,picture&noinfo`,
      { signal: AbortSignal.timeout(15000) }
    ),
  ]);

  if (!trRes.ok || !euRes.ok) throw new Error('randomuser.me fetch failed');

  const trData = await trRes.json();
  const euData = await euRes.json();

  // Shuffle Turkish and European users together
  const results = [...trData.results, ...euData.results].sort(() => Math.random() - 0.5);
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

      const uid   = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const email = `bot.${uid}@takeapp.internal`;

      const record = await createUser({
        email,
        password:          'TakeBot2024!',
        passwordConfirm:   'TakeBot2024!',
        name,
        age,
        gender:            ru.gender === 'male' ? 'male' : 'female',
        grade:             JSON.stringify(grade),
        climbing_styles:   JSON.stringify(styles),
        home_gym:          gym,
        bio,
        intent:            JSON.stringify(intent),
        latitude:          jitter(location.lat),
        longitude:         jitter(location.lon),
        profile_completed: true,
        verified:          true,
      }, adminToken);

      const imgCount = await uploadPhotos(record.id, ru.picture.large, climbingPool, adminToken);

      created++;
      process.stdout.write(
        `\r[${created + failed}/${results.length}] ✓ ${name.padEnd(22)} ${grade.value.padEnd(5)} ${location.city.padEnd(14)} 📷${imgCount}`
      );

      await sleep(150);

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
  console.log(`\nTo delete all bots: filter by email ~ "takeapp.internal" in PocketBase admin.`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
