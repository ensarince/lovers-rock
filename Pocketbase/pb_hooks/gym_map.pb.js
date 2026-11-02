/// <reference path="../pb_data/types.d.ts" />

// Gyms for the map, clustered on the server. See handoff/MAP-PLAN.md, Phase 2.
//
//   GET /api/gym-map?minLat=&maxLat=&minLon=&maxLon=&zoom=
//
// Returns gym pins and cluster bubbles for the visible area. Only gyms with a
// location and at least one climber are included. Nothing about any person
// leaves this handler, just gym names, gym coordinates and counts.
//
// Clustering happens here, not on the phone, so the response stays small no
// matter how many gyms exist: the visible area is cut into a grid sized to the
// zoom level, and any cell holding more than one gym becomes one bubble.

routerAdd('GET', '/api/gym-map', function (e) {
    var authRecord = e.auth;
    if (!authRecord || !authRecord.id) {
        return e.json(401, { error: 'Unauthorized' });
    }

    var q = e.request.url.query();
    var num = function (key, fallback) {
        var v = parseFloat(q.get(key));
        return isFinite(v) ? v : fallback;
    };

    var minLat = Math.max(-90, num('minLat', -90));
    var maxLat = Math.min(90, num('maxLat', 90));
    var minLon = num('minLon', -180);
    var maxLon = num('maxLon', 180);
    var zoom = Math.max(0, Math.min(20, num('zoom', 2)));

    // A view across the date line arrives as minLon > maxLon.
    var lonFilter = minLon <= maxLon
        ? 'longitude BETWEEN {:minLon} AND {:maxLon}'
        : '(longitude >= {:minLon} OR longitude <= {:maxLon})';

    // -0 tells DynamicModel "float"; a plain 0 would make it scan as int and fail.
    var rows = arrayOf(new DynamicModel({ id: '', name: '', latitude: -0, longitude: -0, climbers: 0 }));
    try {
        $app.db()
            .newQuery(
                'SELECT id, name, latitude, longitude, climber_count AS climbers FROM gyms ' +
                'WHERE climber_count > 0 AND (latitude != 0 OR longitude != 0) ' +
                'AND latitude BETWEEN {:minLat} AND {:maxLat} AND ' + lonFilter + ' ' +
                'ORDER BY climber_count DESC LIMIT 2000'
            )
            .bind({ minLat: minLat, maxLat: maxLat, minLon: minLon, maxLon: maxLon })
            .all(rows);
    } catch (err) {
        console.error('[gym_map] query failed:', String(err));
        return e.json(500, { error: 'Could not load gyms' });
    }

    // Close in, every gym gets its own pin.
    if (zoom >= 13) {
        var pins = [];
        for (var p = 0; p < rows.length; p++) {
            pins.push(gymItem(rows[p]));
        }
        return e.json(200, { items: pins });
    }

    // About 64 screen pixels per cell: 360 degrees span 256px at zoom 0.
    var cell = 90 / Math.pow(2, zoom);

    var cells = {};
    var order = [];
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var key = Math.floor(r.latitude / cell) + ':' + Math.floor(r.longitude / cell);
        if (!cells[key]) {
            cells[key] = { gyms: [], lat: 0, lon: 0, climbers: 0 };
            order.push(key);
        }
        var c = cells[key];
        c.gyms.push(r);
        c.lat += r.latitude;
        c.lon += r.longitude;
        c.climbers += r.climbers;
    }

    var items = [];
    for (var k = 0; k < order.length; k++) {
        var group = cells[order[k]];
        if (group.gyms.length === 1) {
            items.push(gymItem(group.gyms[0]));
        } else {
            items.push({
                type: 'cluster',
                id: 'c' + order[k],
                latitude: group.lat / group.gyms.length,
                longitude: group.lon / group.gyms.length,
                gyms: group.gyms.length,
                climbers: group.climbers,
            });
        }
    }

    return e.json(200, { items: items });

    function gymItem(row) {
        return {
            type: 'gym',
            id: row.id,
            name: row.name,
            latitude: row.latitude,
            longitude: row.longitude,
            climbers: row.climbers,
        };
    }
});
