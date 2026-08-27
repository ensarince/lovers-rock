/// <reference path="../pb_data/types.d.ts" />

// Suggests home gym names that other climbers have already entered.
//
// home_gym is free text, so the same wall ends up stored as "BW", "bw" and
// "Boulderwerk", and none of those match each other in search or filters. Nudging
// people towards a spelling their neighbours already used keeps the data usable.
//
// Names are grouped case-insensitively and the most common spelling of each wins,
// so a handful of people typing "boulderwerk" does not unseat "Boulderwerk".
//
// No new exposure: home_gym is already readable through public_profiles.

routerAdd('GET', '/api/gym-suggestions', function (e) {
    try {
        var authRecord = e.auth;
        if (!authRecord || !authRecord.id) {
            return e.json(401, { error: 'Unauthorized' });
        }

        var query = String(e.request.url.query().get('q') || '').trim().toLowerCase();
        var limit = 8;

        // Admin-level read, bypassing the users listRule. Only the gym name and a
        // count leave this handler, never anything identifying.
        var rows = arrayOf(new DynamicModel({ name: '', total: 0 }));
        $app.db()
            .newQuery(
                "SELECT home_gym AS name, COUNT(*) AS total FROM users " +
                "WHERE home_gym IS NOT NULL AND TRIM(home_gym) != '' " +
                "GROUP BY home_gym"
            )
            .all(rows);

        // Merge spellings that differ only by case or surrounding whitespace.
        var grouped = {};
        for (var i = 0; i < rows.length; i++) {
            var name = String(rows[i].name || '').trim();
            if (!name) continue;

            var key = name.toLowerCase();
            var total = Number(rows[i].total) || 0;

            if (!grouped[key]) {
                grouped[key] = { name: name, total: 0, best: 0 };
            }
            grouped[key].total += total;

            // Keep the spelling the most people actually typed.
            if (total > grouped[key].best) {
                grouped[key].best = total;
                grouped[key].name = name;
            }
        }

        var suggestions = [];
        for (var key in grouped) {
            if (query && key.indexOf(query) === -1) continue;
            suggestions.push({ name: grouped[key].name, count: grouped[key].total });
        }

        suggestions.sort(function (a, b) {
            // A name that starts with what was typed beats one that merely contains it.
            if (query) {
                var aStarts = a.name.toLowerCase().indexOf(query) === 0;
                var bStarts = b.name.toLowerCase().indexOf(query) === 0;
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
            }
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });

        return e.json(200, { items: suggestions.slice(0, limit) });
    } catch (err) {
        console.error('[gym_suggestions] error:', String(err));
        // Suggestions are a convenience, never a blocker. An empty list just means
        // the field behaves like the plain text input it was before.
        return e.json(200, { items: [] });
    }
});
