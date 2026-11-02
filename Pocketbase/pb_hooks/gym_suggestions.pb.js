/// <reference path="../pb_data/types.d.ts" />

// Suggests home gym names that other climbers have already entered.
//
// home_gym is free text, so the same wall ends up stored as "BW", "bw" and
// "Boulderwerk", and none of those match each other in search or filters. Nudging
// people towards a spelling their neighbours already used keeps the data usable.
//
// Suggestions come from the gyms collection, where case and spacing variants are
// already one gym and admin-merged spellings are kept as aliases.
//
// No new exposure: gym names and counts, nothing about any person.

routerAdd('GET', '/api/gym-suggestions', function (e) {
    try {
        var authRecord = e.auth;
        if (!authRecord || !authRecord.id) {
            return e.json(401, { error: 'Unauthorized' });
        }

        var query = String(e.request.url.query().get('q') || '').trim().toLowerCase();
        var limit = 8;

        // Reads the gyms collection (pb_hooks/gyms.pb.js keeps it in step with
        // what people type). Only names and counts leave this handler. Gyms
        // nobody lists any more are left out.
        var rows = arrayOf(new DynamicModel({ name: '', name_key: '', aliases: '', total: 0 }));
        $app.db()
            .newQuery(
                "SELECT name, name_key, aliases, climber_count AS total FROM gyms " +
                "WHERE climber_count > 0"
            )
            .all(rows);

        var grouped = {};
        for (var i = 0; i < rows.length; i++) {
            var name = String(rows[i].name || '').trim();
            if (!name) continue;

            // Match on the name and on merged-in spellings, so typing "bw"
            // still finds Boulderwerk once an admin has merged them.
            var keys = [String(rows[i].name_key || name.toLowerCase())];
            try {
                var aliases = JSON.parse(String(rows[i].aliases || '[]'));
                if (Array.isArray(aliases)) keys = keys.concat(aliases);
            } catch (_) {}

            grouped[keys.join('|')] = { name: name, total: Number(rows[i].total) || 0 };
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
