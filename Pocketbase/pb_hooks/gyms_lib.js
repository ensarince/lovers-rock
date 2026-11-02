/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for the gyms hooks. PocketBase runs every hook handler in its
// own isolated scope, so anything shared has to be require()d from a plain module
// like this one (note: .js, not .pb.js, so it is not loaded as a hook itself).
//
// The model: users still type a free-text home_gym, and old app builds keep
// working exactly as before. The server resolves that text to a gym record and
// stores it in users.gym. That link is what the map counts and pins.

// "  Boulder  Werk " and "boulder werk" are the same gym.
function normKey(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function readAliases(record) {
    try {
        var parsed = JSON.parse(toString(record.get('aliases')) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

// Exact name first, then the aliases an admin collected by merging gyms.
function findGym(app, name) {
    var key = normKey(name);
    if (!key) return null;

    try {
        return app.findFirstRecordByFilter('gyms', 'name_key = {:key}', { key: key });
    } catch (_) {}

    var row = new DynamicModel({ id: '' });
    try {
        app.db()
            .newQuery(
                'SELECT gyms.id AS id FROM gyms, json_each(gyms.aliases) ' +
                'WHERE LOWER(json_each.value) = {:key} LIMIT 1'
            )
            .bind({ key: key })
            .one(row);
        if (row.id) return app.findRecordById('gyms', row.id);
    } catch (_) {}

    return null;
}

// Typing a gym nobody has entered yet is how a new gym gets added. It starts
// without a location; the geocode cron fills that in.
function resolveOrCreate(app, name, userId) {
    var key = normKey(name);
    if (!key) return '';

    var existing = findGym(app, name);
    if (existing) return existing.id;

    var gym = new Record(app.findCollectionByNameOrId('gyms'));
    gym.set('name', String(name).trim().replace(/\s+/g, ' '));
    gym.set('name_key', key);
    gym.set('aliases', []);
    gym.set('climber_count', 0);
    if (userId) gym.set('created_by', userId);
    app.save(gym);
    return gym.id;
}

// Raw SQL on purpose: counts change on every profile save and must not fire the
// gyms record hooks (which handle merges) each time.
function recount(app, gymId) {
    if (!gymId) return;
    app.db()
        .newQuery(
            'UPDATE gyms SET climber_count = ' +
            '(SELECT COUNT(*) FROM users WHERE users.gym = {:id}) WHERE id = {:id}'
        )
        .bind({ id: gymId })
        .execute();
}

// Looks up a gym on OpenStreetMap. Biased to a box around the person who first
// entered it, because "Boulderwerk" exists in more than one city. Only the box
// leaves the server, never who it belongs to.
var GYM_CATEGORIES = ['leisure', 'sport', 'club'];

function geocode(gym, creator) {
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' +
        encodeURIComponent(gym.get('name'));

    var lat = creator ? Number(creator.get('latitude')) : 0;
    var lon = creator ? Number(creator.get('longitude')) : 0;
    if (lat || lon) {
        var d = 0.5; // roughly 50km either way: the person's city and around it
        url += '&bounded=1&viewbox=' + [lon - d, lat + d, lon + d, lat - d].join(',');
    }

    var res = $http.send({
        url: url,
        method: 'GET',
        // Nominatim's usage policy asks for an identifying user agent.
        headers: { 'User-Agent': 'Take-climbing-app/1.0 (gym geocoding)' },
        timeout: 15,
    });
    if (res.statusCode !== 200) return null;

    var hits = res.json;
    if (!Array.isArray(hits)) return null;

    // Only take places OSM files as sport or leisure (climbing halls are
    // leisure=sports_centre and friends). Without this, junk names like "Hasan"
    // land on a random street with the same name. A miss is fine: an admin can
    // type the location in by hand.
    for (var i = 0; i < hits.length; i++) {
        var category = String(hits[i].category || '');
        if (GYM_CATEGORIES.indexOf(category) === -1) continue;

        var out = { lat: Number(hits[i].lat), lon: Number(hits[i].lon) };
        if (isFinite(out.lat) && isFinite(out.lon)) return out;
    }
    return null;
}

module.exports = {
    normKey: normKey,
    readAliases: readAliases,
    findGym: findGym,
    resolveOrCreate: resolveOrCreate,
    recount: recount,
    geocode: geocode,
};
