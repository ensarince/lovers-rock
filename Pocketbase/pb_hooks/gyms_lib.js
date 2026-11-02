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

// --- Fuzzy fallback ---------------------------------------------------------
//
// People type gym names fast: "akalla klattecentret" for Klättercentret in
// Akalla. Nominatim wants the name nearly exact, so that finds nothing. When it
// misses, fetch every climbing venue (OSM sport=climbing) near the person who
// entered the gym, and pick the one whose name, ignoring accents and small
// typos, best matches what they typed. Extra words like "akalla" can also match
// the venue's address, which tells branches of the same chain apart.

var ACCENTS = {
    'ä': 'a', 'á': 'a', 'à': 'a', 'â': 'a', 'å': 'a', 'ã': 'a', 'æ': 'ae',
    'ö': 'o', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ø': 'o', 'õ': 'o', 'œ': 'oe',
    'ü': 'u', 'ú': 'u', 'ù': 'u', 'û': 'u',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ı': 'i',
    'ç': 'c', 'ñ': 'n', 'ß': 'ss', 'ş': 's', 'ğ': 'g', 'ł': 'l', 'ž': 'z', 'š': 's', 'č': 'c',
};

// Words that say "climbing gym" in some language and carry no identity.
var FILLER = ['the', 'gym', 'climbing', 'bouldering', 'boulder', 'center', 'centre', 'hall', 'halle', 'kletterhalle', 'boulderhalle', 'de', 'der', 'die', 'das'];

function plain(text) {
    var lower = String(text || '').toLowerCase();
    var out = '';
    for (var i = 0; i < lower.length; i++) {
        var ch = lower.charAt(i);
        out += ACCENTS[ch] !== undefined ? ACCENTS[ch] : ch;
    }
    return out.replace(/[^a-z0-9]+/g, ' ').trim();
}

function words(text) {
    var all = plain(text).split(' ');
    var out = [];
    for (var i = 0; i < all.length; i++) {
        if (all[i].length >= 3 && FILLER.indexOf(all[i]) === -1) out.push(all[i]);
    }
    return out;
}

function editDistance(a, b) {
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev.push(j);
    for (var i = 1; i <= a.length; i++) {
        var cur = [i];
        for (var k = 1; k <= b.length; k++) {
            var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
            cur.push(Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost));
        }
        prev = cur;
    }
    return prev[b.length];
}

// Close enough to be the same word: about one typo per five letters.
function wordsMatch(a, b) {
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 4) return false;
    return editDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 5));
}

function anyMatch(word, list) {
    for (var i = 0; i < list.length; i++) {
        if (wordsMatch(word, list[i])) return true;
    }
    return false;
}

// How well what someone typed matches a venue. At least one typed word must
// match the venue's name. Words matching the address count for a bit, and
// words matching nothing count against it but don't rule it out: OSM often
// lacks the district people use ("akalla" isn't on Klättercentret Akalla's
// tags), and among same-named branches the nearest one wins anyway.
function venueScore(typed, tags) {
    var nameWords = words(tags.name);
    if (nameWords.length === 0) return 0;

    var placeWords = words([
        tags['addr:suburb'], tags['addr:city'], tags['addr:street'],
        tags['addr:place'], tags['addr:quarter'], tags.branch,
    ].join(' '));

    var nameHits = 0;
    var placeHits = 0;
    var misses = 0;
    for (var i = 0; i < typed.length; i++) {
        if (anyMatch(typed[i], nameWords)) nameHits++;
        else if (anyMatch(typed[i], placeWords)) placeHits++;
        else misses++;
    }
    if (nameHits === 0) return 0;

    // Prefer venues whose name is mostly made of what was typed.
    return Math.max(0.01, nameHits * 2 + placeHits - misses * 0.5 + nameHits / nameWords.length);
}

function geocodeFuzzy(gym, creator) {
    var lat = creator ? Number(creator.get('latitude')) : 0;
    var lon = creator ? Number(creator.get('longitude')) : 0;
    // Without a location to search around, a fuzzy guess could land anywhere.
    if (!lat && !lon) return null;

    var typed = words(gym.get('name'));
    if (typed.length === 0) return null;

    var d = 0.5;
    // Overpass is a shared free service and can take a minute when busy.
    // This runs in a background cron, so waiting is fine.
    var query = '[out:json][timeout:80];nwr["sport"="climbing"]["name"](' +
        [lat - d, lon - d, lat + d, lon + d].join(',') + ');out center tags;';

    // The main Overpass server is often overloaded (502/504); try a mirror next.
    var servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
    var res = null;
    var lastError = '';
    for (var s = 0; s < servers.length; s++) {
        try {
            res = $http.send({
                url: servers[s],
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Take-climbing-app/1.0 (gym geocoding)',
                },
                body: 'data=' + encodeURIComponent(query),
                timeout: 90,
            });
            if (res.statusCode === 200) break;
            lastError = 'HTTP ' + res.statusCode;
        } catch (err) {
            lastError = String(err);
        }
        res = null;
    }
    // Busy or down is not "no such gym": tell the caller to try again later.
    if (!res) throw new Error('Overpass unavailable (' + lastError + ')');

    var elements = (res.json && res.json.elements) || [];
    var best = null;
    var bestScore = 0;
    var bestDist = Infinity;
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var tags = el.tags || {};
        var elLat = el.lat !== undefined ? el.lat : (el.center && el.center.lat);
        var elLon = el.lon !== undefined ? el.lon : (el.center && el.center.lon);
        if (!isFinite(elLat) || !isFinite(elLon)) continue;

        var score = venueScore(typed, tags);
        if (score === 0) continue;

        // Same score (a chain with branches): take the one nearest the person.
        var dist = Math.pow(elLat - lat, 2) + Math.pow(elLon - lon, 2);
        if (score > bestScore || (score === bestScore && dist < bestDist)) {
            best = { lat: Number(elLat), lon: Number(elLon), name: tags.name };
            bestScore = score;
            bestDist = dist;
        }
    }
    return best;
}

module.exports = {
    normKey: normKey,
    readAliases: readAliases,
    findGym: findGym,
    resolveOrCreate: resolveOrCreate,
    recount: recount,
    geocode: geocode,
    geocodeFuzzy: geocodeFuzzy,
    // Exposed for tests.
    venueScore: venueScore,
    words: words,
};
