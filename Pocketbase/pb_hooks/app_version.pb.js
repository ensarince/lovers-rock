/// <reference path="../pb_data/types.d.ts" />

// Tells the app which version is live on Google Play, so it can ask people on
// an older build to update.
//
//   GET /api/app-version  ->  { android: { latest: "1.2.0" | null } }
//
// Google has no public "latest version" API, so this reads the version off the
// public Play Store page. That is scraping and Google could change the page;
// when it does, latest comes back null and the app simply shows no prompt.
// Nothing breaks, people just aren't nagged until this is fixed.
//
// Escape hatch: set ANDROID_LATEST_VERSION on Railway to override the scrape.
//
// The page is fetched at most every 6 hours and kept in memory, so app launches
// never hit Google directly. Public on purpose: the check runs before login.

routerAdd('GET', '/api/app-version', function (e) {
    var PACKAGE = 'com.takeclimbing.takeapp';
    var CACHE_KEY = 'app_version_android';
    var MAX_AGE_MS = 6 * 60 * 60 * 1000;
    var RETRY_AFTER_FAIL_MS = 15 * 60 * 1000;

    var override = String($os.getenv('ANDROID_LATEST_VERSION') || '').trim();
    if (override) {
        return e.json(200, { android: { latest: override } });
    }

    var now = Date.now();
    var cached = $app.store().get(CACHE_KEY);
    if (cached && now - cached.at < (cached.latest ? MAX_AGE_MS : RETRY_AFTER_FAIL_MS)) {
        return e.json(200, { android: { latest: cached.latest } });
    }

    var latest = null;
    try {
        var res = $http.send({
            url: 'https://play.google.com/store/apps/details?hl=en&id=' + PACKAGE,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36' },
            timeout: 10,
        });
        if (res.statusCode === 200) {
            // The version sits in the page's embedded data as [[["1.2.0"]]
            // PocketBase 0.26 puts the response text in .raw; .body is empty.
            var match = String(res.raw || '').match(/\[\[\["(\d+\.\d+(?:\.\d+)?)"\]\]/);
            if (match) latest = match[1];
        }
        if (!latest) console.error('[app_version] could not find version on Play page (HTTP ' + res.statusCode + ')');
    } catch (err) {
        console.error('[app_version] fetch failed:', String(err));
    }

    // A failed scrape keeps the last good answer rather than dropping to null.
    if (!latest && cached && cached.latest) latest = cached.latest;

    $app.store().set(CACHE_KEY, { at: now, latest: latest });
    return e.json(200, { android: { latest: latest } });
});
