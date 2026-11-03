/// <reference path="../pb_data/types.d.ts" />

// The climbers at one gym, for the gym page on the map. See handoff/MAP-PLAN.md,
// Phase 3.
//
//   GET /api/gym-climbers?gym=<id>  ->  { gym: {id, name}, items: [...] }
//
// Each item is the same public profile Discover already serves, plus `home`:
// true when this is their home gym, false when they "also climb here". No
// coordinates and no distance: the gym page is about the gym, and repeating a
// distance per person here would hand out the trilateration data the map was
// designed to avoid.
//
// Same visibility rules as Discover (finished, verified profiles only), and
// blocks are applied here on the server in both directions, so someone who
// blocked you, or whom you blocked, never shows up.

routerAdd('GET', '/api/gym-climbers', function (e) {
    var authRecord = e.auth;
    if (!authRecord || !authRecord.id) {
        return e.json(401, { error: 'Unauthorized' });
    }

    var gymId = String(e.request.url.query().get('gym') || '').replace(/[^a-z0-9]/g, '');
    if (!gymId) return e.json(400, { error: 'Missing gym' });

    var gym;
    try {
        gym = $app.findRecordById('gyms', gymId);
    } catch (_) {
        return e.json(404, { error: 'Gym not found' });
    }

    var parseArray = function (value) {
        if (Array.isArray(value)) return value;
        try {
            var parsed = JSON.parse(toString(value) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    };
    var parseObject = function (value) {
        try {
            var parsed = JSON.parse(toString(value) || 'null');
            // Some older records hold the grade double-encoded (a JSON string
            // of JSON); /api/nearby-profiles unwraps that too.
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (_) {
            return null;
        }
    };

    try {
        var me = $app.findRecordById('users', authRecord.id);

        // Everyone on either side of a block with me.
        var hidden = {};
        var myBlocked = parseArray(me.get('blocked_users'));
        for (var b = 0; b < myBlocked.length; b++) hidden[String(myBlocked[b])] = true;
        var blocks = $app.findRecordsByFilter(
            'blocks',
            'from_user = {:me} || to_user = {:me}',
            '',
            5000,
            0,
            { me: me.id }
        );
        for (var k = 0; k < blocks.length; k++) {
            hidden[String(blocks[k].get('from_user'))] = true;
            hidden[String(blocks[k].get('to_user'))] = true;
        }

        var records = $app.findRecordsByFilter(
            'users',
            'profile_completed = true && verified = true && id != {:me} && (gym = {:gym} || extra_gyms.id ?= {:gym})',
            '-created',
            200,
            0,
            { me: me.id, gym: gym.id }
        );

        var items = [];
        for (var i = 0; i < records.length; i++) {
            var r = records[i];
            if (hidden[r.id]) continue;
            // Their own block list counts too (older clients only wrote it there).
            if (parseArray(r.get('blocked_users')).indexOf(me.id) !== -1) continue;

            var intent = parseArray(r.get('intent'));
            if (intent.length === 0 && r.get('intent')) intent = [String(r.get('intent'))];

            items.push({
                id: r.id,
                name: r.get('name') || '',
                age: r.get('age'),
                gender: r.get('gender') || '',
                grade: parseObject(r.get('grade')),
                climbing_styles: parseArray(r.get('climbing_styles')),
                home_gym: r.get('home_gym') || '',
                other_gyms: parseArray(r.get('other_gyms')),
                bio: r.get('bio') || '',
                verified: r.get('verified') === true,
                images: parseArray(r.get('images')),
                intent: intent,
                profile_completed: true,
                home: String(r.get('gym') || '') === gym.id,
            });
        }

        // Regulars first, then people who also climb here.
        items.sort(function (a, b) {
            return a.home === b.home ? 0 : a.home ? -1 : 1;
        });

        // The list leaves out the person asking, so tell them separately whether
        // they climb here. Otherwise "only you" looks the same as "nobody".
        var myExtra = [];
        try { myExtra = me.getStringSlice('extra_gyms'); } catch (_) {}
        var you = String(me.get('gym') || '') === gym.id ? 'home'
            : myExtra.indexOf(gym.id) !== -1 ? 'also' : null;

        return e.json(200, { gym: { id: gym.id, name: gym.get('name') }, you: you, items: items });
    } catch (err) {
        console.error('[gym_climbers] error:', String(err));
        return e.json(500, { error: 'Could not load climbers' });
    }
});
