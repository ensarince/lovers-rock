/// <reference path="../pb_data/types.d.ts" />

// Keeps users.gym in step with the free-text home_gym, keeps gym climber counts
// right, merges gyms on admin request, and geocodes new gyms in the background.
// See handoff/MAP-PLAN.md, Phase 1.

// --- Linking a user to a gym ------------------------------------------------

onRecordCreate((e) => {
    var lib = require(`${__hooks}/gyms_lib.js`);
    var gymId = '';
    try {
        gymId = lib.resolveOrCreate(e.app, e.record.get('home_gym'), '');
        e.record.set('gym', gymId);
    } catch (err) {
        console.error('[gyms] resolve on create failed:', String(err));
    }

    e.next();

    try {
        if (gymId) {
            // The creator is only known once the user exists.
            var gym = e.app.findRecordById('gyms', gymId);
            if (!gym.get('created_by')) {
                gym.set('created_by', e.record.id);
                e.app.save(gym);
            }
            lib.recount(e.app, gymId);
        }
    } catch (err) {
        console.error('[gyms] recount on create failed:', String(err));
    }
}, 'users');

onRecordUpdate((e) => {
    var lib = require(`${__hooks}/gyms_lib.js`);
    var original = e.record.original();
    var before = lib.normKey(original.get('home_gym'));
    var after = lib.normKey(e.record.get('home_gym'));
    var oldGym = String(original.get('gym') || '');

    // Location pings arrive every 30s per user, so bail out fast when the gym
    // did not change. The second half self-heals anyone with a gym name but no link.
    if (before === after && (oldGym || !after)) return e.next();

    var newGym = oldGym;
    try {
        newGym = lib.resolveOrCreate(e.app, e.record.get('home_gym'), e.record.id);
        e.record.set('gym', newGym);
    } catch (err) {
        console.error('[gyms] resolve on update failed:', String(err));
    }

    e.next();

    if (oldGym === newGym) return;
    try {
        lib.recount(e.app, oldGym);
        lib.recount(e.app, newGym);
    } catch (err) {
        console.error('[gyms] recount on update failed:', String(err));
    }
}, 'users');

onRecordAfterDeleteSuccess((e) => {
    try {
        var lib = require(`${__hooks}/gyms_lib.js`);
        lib.recount(e.app, String(e.record.get('gym') || ''));
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

    for (var i = 0; i < pending.length; i++) {
        var gym = pending[i];
        try {
            var creator = null;
            var creatorId = String(gym.get('created_by') || '');
            if (creatorId) {
                try { creator = $app.findRecordById('users', creatorId); } catch (_) {}
            }

            var hit = lib.geocode(gym, creator);
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
