/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.
//
// Flow:
//   Google → GET /api/mobile-oauth-callback → code stored + HTML page that JS-redirects to loversrock://oauth
//   App polls GET /api/oauth-code-poll?state=xxx every 1.5 s
//
// We use an HTML page instead of a 302 redirect because PocketBase rejects
// e.redirect() to non-HTTP schemes (loversrock://). The HTML approach works
// in Chrome: window.location.href fires the Android Intent for the app.
// The poll is the reliable fallback when Android 10+ blocks Chrome (backgrounded
// during number-matching challenge) from launching the Intent.

const pendingOAuth = {};

function cleanup() {
    const now = Date.now();
    for (const k in pendingOAuth) {
        if (pendingOAuth[k].expires < now) delete pendingOAuth[k];
    }
}

routerAdd('GET', '/api/mobile-oauth-callback', (e) => {
    cleanup();
    const code  = e.request.url.query().get('code');
    const state = e.request.url.query().get('state');
    const error = e.request.url.query().get('error');

    let deepLink;
    if (error) {
        deepLink = 'loversrock://oauth?error=' + encodeURIComponent(error);
    } else if (!code || !state) {
        deepLink = 'loversrock://oauth?error=missing_params';
    } else {
        // Store for polling (5-minute TTL)
        pendingOAuth[state] = { code, expires: Date.now() + 5 * 60 * 1000 };
        deepLink = 'loversrock://oauth?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state);
    }

    // Return an HTML page that navigates to the deep link via JS.
    // This triggers the Android Intent for loversrock:// without PocketBase
    // needing to issue a 302 to a non-HTTP scheme.
    return e.html(200, '<!DOCTYPE html><html><head>' +
        '<script>window.location.replace("' + deepLink + '")</script>' +
        '<meta http-equiv="refresh" content="0;url=' + deepLink + '">' +
        '</head><body>' +
        '<p>Redirecting back to Lovers Rock…</p>' +
        '</body></html>');
});

// Poll endpoint: app calls this every ~1.5 s while waiting for the code
routerAdd('GET', '/api/oauth-code-poll', (e) => {
    cleanup();
    const state = e.request.url.query().get('state');
    if (!state || !pendingOAuth[state]) {
        return e.json(200, { found: false });
    }
    const code = pendingOAuth[state].code;
    delete pendingOAuth[state];
    return e.json(200, { found: true, code });
});
