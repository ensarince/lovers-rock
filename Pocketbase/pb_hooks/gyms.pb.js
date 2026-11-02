/// <reference path="../pb_data/types.d.ts" />

// Keeps users.gym / users.extra_gyms in step with the gym names people type, keeps gym climber counts
// right, merges gyms on admin request, and geocodes new gyms in the background.
// See handoff/MAP-PLAN.md, Phase 1.

// --- Linking a user to gyms ------------------------------------------------
//
// home_gym -> gym, and other_gyms -> extra_gyms ("I climb here too"). The
// matching logic lives in gyms_lib.syncUserGyms.

onRecordCreate((e) => {
    var lib = require(`${__hooks}/gyms_lib.js`);
    var touched = [];
    try {
        touched = lib.syncUserGyms(e.app, e.record, null);
    } catch (err) {
        console.error('[gyms] resolve on create failed:', String(err));
    }

    e.next();

    try {
        // A gym this user just created gets them as its creator, which biases
        // its geocoding to their city. Only known once the user exists.
        for (var i = 0; i < touched.length; i++) {
            if (!touched[i]) continue;
            var gym = e.app.findRecordById('gyms', touched[i]);
            if (!gym.get('created_by')) {
                gym.set('created_by', e.record.id);
                e.app.save(gym);
            }
        }
        lib.recountAll(e.app, touched);
    } catch (err) {
        console.error('[gyms] recount on create failed:', String(err));
    }
}, 'users');

onRecordUpdate((e) => {
    var lib = require(`${__hooks}/gyms_lib.js`);
    var touched = [];
    try {
        touched = lib.syncUserGyms(e.app, e.record, e.record.original());
    } catch (err) {
        console.error('[gyms] resolve on update failed:', String(err));
    }

    e.next();

    if (touched.length === 0) return;
    try {
        lib.recountAll(e.app, touched);
    } catch (err) {
        console.error('[gyms] recount on update failed:', String(err));
    }
}, 'users');

onRecordAfterDeleteSuccess((e) => {
    try {
        var lib = require(`${__hooks}/gyms_lib.js`);
        lib.recountAll(e.app, [String(e.record.get('gym') || '')].concat(lib.relationIds(e.record, 'extra_gyms')));
    } catch (err) {
        console.error('[gyms] recount on delete failed:', String(err));
    }
    e.next();
}, 'users');

// --- Merging duplicates -----------------------------------------------------
//
// In the admin UI, set "merge_into" on the duplicate ("Bw") to the real gym
// (Boulderwerk) and save. Everyone moves over, their home_gym text is corrected,
// the old spelling becomes an alias so it resolves correctly from now on, and the
// duplicate is deleted.

onRecordAfterUpdateSuccess((e) => {
    var from = e.record;
    var intoId = String(from.get('merge_into') || '');
    if (!intoId || intoId === from.id) return e.next();

    try {
        var lib = require(`${__hooks}/gyms_lib.js`);
        var into = e.app.findRecordById('gyms', intoId);

        var aliases = lib.readAliases(into);
        var incoming = [from.get('name_key')].concat(lib.readAliases(from));
        for (var i = 0; i < incoming.length; i++) {
            var a = lib.normKey(incoming[i]);
            if (a && a !== into.get('name_key') && aliases.indexOf(a) === -1) aliases.push(a);
        }
        into.set('aliases', aliases);
        if (!into.get('latitude') && !into.get('longitude') && (from.get('latitude') || from.get('longitude'))) {
            into.set('latitude', from.get('latitude'));
            into.set('longitude', from.get('longitude'));
        }
        e.app.save(into);

        e.app.db()
            .newQuery('UPDATE users SET gym = {:into}, home_gym = {:name} WHERE gym = {:from}')
            .bind({ into: into.id, name: into.get('name'), from: from.id })
            .execute();

        // Same for people who listed the duplicate as an extra gym: point them
        // at the real gym and fix the name they see, without duplicates.
        var fromKeys = [lib.normKey(from.get('name'))].concat(incoming.map(lib.normKey));
        var extraUsers = e.app.findRecordsByFilter('users', 'extra_gyms.id ?= {:id}', '', 10000, 0, { id: from.id });
        for (var u = 0; u < extraUsers.length; u++) {
            var user = extraUsers[u];
            var homeId = String(user.get('gym') || '');
            var ids = [];
            var current = lib.relationIds(user, 'extra_gyms');
            for (var c = 0; c < current.length; c++) {
                var next = current[c] === from.id ? into.id : current[c];
                if (next !== homeId && ids.indexOf(next) === -1) ids.push(next);
            }
            var names = [];
            var typed = lib.readJsonArray(user, 'other_gyms');
            for (var t = 0; t < typed.length; t++) {
                var n = fromKeys.indexOf(lib.normKey(typed[t])) !== -1 ? into.get('name') : typed[t];
                if (into.id === homeId && n === into.get('name')) continue;
                if (names.indexOf(n) === -1) names.push(n);
            }
            e.app.db()
                .newQuery('UPDATE users SET extra_gyms = {:ids}, other_gyms = {:names} WHERE id = {:id}')
                .bind({ ids: JSON.stringify(ids), names: JSON.stringify(names), id: user.id })
                .execute();
        }

        // Anything pointing at the duplicate follows it to the real gym.
        e.app.db()
            .newQuery('UPDATE gyms SET merge_into = {:into} WHERE merge_into = {:from}')
            .bind({ into: into.id, from: from.id })
            .execute();

        e.app.delete(from);
        lib.recount(e.app, into.id);
        console.log('[gyms] merged "' + from.get('name') + '" into "' + into.get('name') + '"');
    } catch (err) {
        console.error('[gyms] merge failed:', String(err));
    }
    e.next();
}, 'gyms');

// --- Geocoding --------------------------------------------------------------
//
// New gyms arrive without a location. Every 15 minutes, look up a few of them on
// OpenStreetMap. Each gym is tried once; a miss is left for an admin to fill in
// by hand (geocode_tried stays true so it is never hammered again).

cronAdd('gyms_geocode', '*/15 * * * *', () => {
    var lib = require(`${__hooks}/gyms_lib.js`);
    var pending = [];
    try {
        pending = $app.findRecordsByFilter(
            'gyms',
            'geocode_tried = false && latitude = 0 && longitude = 0',
            '-climber_count',
            5,
            0
        );
    } catch (err) {
        console.error('[gyms] geocode query failed:', String(err));
        return;
    }

    // Overpass can take minutes when busy, so cap the fuzzy lookups per round
    // to keep one round from running into the next.
    var fuzzyLeft = 2;

    for (var i = 0; i < pending.length; i++) {
        var gym = pending[i];
        try {
            var creator = null;
            var creatorId = String(gym.get('created_by') || '');
            if (creatorId) {
                try { creator = $app.findRecordById('users', creatorId); } catch (_) {}
            }

            var hit = lib.geocode(gym, creator);
            if (!hit && fuzzyLeft <= 0) {
                // Out of slow lookups this round; leave it untried for the next.
                sleep(1100);
                continue;
            }
            if (!hit) {
                fuzzyLeft--;
                sleep(1100);
                hit = lib.geocodeFuzzy(gym, creator);
                if (hit) console.log('[gyms] fuzzy match "' + gym.get('name') + '" -> "' + hit.name + '"');
            }
            if (hit) {
                gym.set('latitude', hit.lat);
                gym.set('longitude', hit.lon);
            }
            gym.set('geocode_tried', true);
            $app.save(gym);
            console.log('[gyms] geocode "' + gym.get('name') + '": ' + (hit ? 'found' : 'not found'));
        } catch (err) {
            console.error('[gyms] geocode "' + gym.get('name') + '" failed:', String(err));
        }
        // Nominatim allows one request per second.
        sleep(1100);
    }
});
