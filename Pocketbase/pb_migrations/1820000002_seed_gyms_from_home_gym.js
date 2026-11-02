/// <reference path="../pb_data/types.d.ts" />

// Turns the home_gym names people already typed into gym records, and links
// everyone to theirs.
//
// Spellings that differ only by case or spacing become one gym, named after the
// spelling most people used (same rule as the old autocomplete). Real
// duplicates like "Bw" vs "Boulderwerk" can't be guessed safely, so they stay
// separate until an admin merges them (set merge_into in the admin UI).
//
// Locations are left empty. The geocode cron in pb_hooks/gyms.pb.js fills them
// in a few at a time.

migrate((app) => {
  const normKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const rows = arrayOf(new DynamicModel({ id: '', home_gym: '', has_location: false }));
  app.db()
    .newQuery(
      "SELECT id, home_gym, (latitude != 0 OR longitude != 0) AS has_location FROM users " +
      "WHERE home_gym IS NOT NULL AND TRIM(home_gym) != ''"
    )
    .all(rows);

  // key -> { spellings: {name: count}, users: [ids], creator: id }
  const groups = {};
  for (const row of rows) {
    const key = normKey(row.home_gym);
    if (!key) continue;
    if (!groups[key]) groups[key] = { spellings: {}, users: [], creator: '' };

    const g = groups[key];
    const spelling = String(row.home_gym).trim().replace(/\s+/g, ' ');
    g.spellings[spelling] = (g.spellings[spelling] || 0) + 1;
    g.users.push(row.id);
    // Someone with a location makes the geocoding search land in the right city.
    if (!g.creator || (row.has_location && !g.creatorHasLocation)) {
      g.creator = row.id;
      g.creatorHasLocation = !!row.has_location;
    }
  }

  const gyms = app.findCollectionByNameOrId("pbc_gyms");

  for (const key in groups) {
    const g = groups[key];

    let name = '';
    let best = 0;
    for (const spelling in g.spellings) {
      if (g.spellings[spelling] > best) {
        best = g.spellings[spelling];
        name = spelling;
      }
    }

    const gym = new Record(gyms);
    gym.set('name', name);
    gym.set('name_key', key);
    gym.set('aliases', []);
    gym.set('climber_count', g.users.length);
    gym.set('created_by', g.creator);
    app.save(gym);

    // Raw SQL so this doesn't run the users hooks once per person.
    for (const userId of g.users) {
      app.db()
        .newQuery("UPDATE users SET gym = {:gym} WHERE id = {:id}")
        .bind({ gym: gym.id, id: userId })
        .execute();
    }
  }
}, (app) => {
  app.db().newQuery("UPDATE users SET gym = ''").execute();
  app.db().newQuery("DELETE FROM gyms").execute();
});
