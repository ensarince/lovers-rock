/// <reference path="../pb_data/types.d.ts" />

// Authenticated endpoint that returns public profiles with server-computed
// distance_km. Raw coordinates are never sent to clients.

routerAdd('GET', '/api/nearby-profiles', function(e) {
    try {
        var authRecord = e.auth;
        if (!authRecord || !authRecord.id) {
            return e.json(401, { error: 'Unauthorized' });
        }

        var safeId = String(authRecord.id).replace(/[^a-zA-Z0-9]/g, '');

        // Read requesting user's stored location (server-side, bypasses listRule)
        var me = $app.findRecordById('users', safeId);
        var myLat = me.get('latitude');
        var myLon = me.get('longitude');
        var hasMyLocation = (typeof myLat === 'number' && typeof myLon === 'number' && myLat !== 0 && myLon !== 0);

        function haversineKm(lat1, lon1, lat2, lon2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // Admin-level query — bypasses users listRule.
        // Hard cap of 500 prevents a single request from dumping the full user table.
        var records = $app.findRecordsByFilter(
            'users',
            'profile_completed = true && verified = true && id != "' + safeId + '"',
            '-created',
            500,
            0
        );

        var profiles = [];
        for (var i = 0; i < records.length; i++) {
            var r = records[i];

            var theirLat = r.get('latitude');
            var theirLon = r.get('longitude');
            var distanceKm = null;
            if (hasMyLocation && typeof theirLat === 'number' && typeof theirLon === 'number' && theirLat !== 0 && theirLon !== 0) {
                distanceKm = Math.round(haversineKm(myLat, myLon, theirLat, theirLon));
            }

            var grade = r.get('grade');
            if (typeof grade === 'string') {
                try { grade = JSON.parse(grade); } catch (_) { grade = null; }
            }

            var climbingStyles = r.get('climbing_styles');
            if (typeof climbingStyles === 'string') {
                try { climbingStyles = JSON.parse(climbingStyles); } catch (_) { climbingStyles = []; }
            }
            if (!Array.isArray(climbingStyles)) { climbingStyles = []; }

            var images = r.get('images');
            if (typeof images === 'string') {
                try { images = JSON.parse(images); } catch (_) { images = []; }
            }
            if (!Array.isArray(images)) { images = []; }

            var intent = r.get('intent');
            if (typeof intent === 'string') {
                try { intent = JSON.parse(intent); } catch (_) { intent = []; }
            }
            if (!Array.isArray(intent)) { intent = intent ? [intent] : []; }

            profiles.push({
                id: r.id,
                name: r.get('name') || '',
                age: r.get('age'),
                gender: r.get('gender') || '',
                grade: grade,
                climbing_styles: climbingStyles,
                home_gym: r.get('home_gym') || '',
                bio: r.get('bio') || '',
                verified: r.get('verified') === true,
                images: images,
                avatar: r.get('avatar') || '',
                intent: intent,
                profile_completed: r.get('profile_completed') === true,
                distance_km: distanceKm,
            });
        }

        return e.json(200, { items: profiles, totalItems: profiles.length });
    } catch (err) {
        return e.json(500, { error: 'Internal error' });
    }
});
