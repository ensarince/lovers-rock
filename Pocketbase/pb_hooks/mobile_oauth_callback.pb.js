/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.
//
// Flow:
//   Google → POST /api/mobile-oauth-callback → stored + 302 to loversrock://oauth
//   App polls GET /api/oauth-code-poll?state=xxx every 1.5 s
//
// The deep-link 302 still works when Chrome delivers it (fast path / fingerprint).
// The poll is the reliable path when Android 10+ blocks Chrome from launching
// the app Intent while Chrome is backgrounded (number-matching challenge).

// In-memory store: state → { code, expires }
// PocketBase hooks run in a persistent JS runtime so this survives across requests.
const pendingOAuth = {};

function cleanup() {
    const now = Date.now();
    for (const k in pendingOAuth) {
        if (pendingOAuth[k].expires < now) delete pendingOAuth[k];
    }
}

// Relay: Google redirects here after auth (or security challenge completion)
routerAdd('GET', '/api/mobile-oauth-callback', (e) => {
    cleanup();
    const code  = e.request.url.query().get('code');
    const state = e.request.url.query().get('state');
    const error = e.request.url.query().get('error');

    if (error) {
        return e.redirect(302, 'loversrock://oauth?error=' + encodeURIComponent(error));
    }
    if (!code || !state) {
        return e.redirect(302, 'loversrock://oauth?error=missing_params');
    }

    // Store for polling (5-minute TTL)
    pendingOAuth[state] = { code, expires: Date.now() + 5 * 60 * 1000 };

    // Also 302 to deep link — works for fast flows where Chrome can launch the Intent
    return e.redirect(302,
        'loversrock://oauth?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state)
    );
});

// Poll endpoint: app calls this every ~1.5 s while waiting for the code
routerAdd('GET', '/api/oauth-code-poll', (e) => {
    cleanup();
    const state = e.request.url.query().get('state');
    if (!state || !pendingOAuth[state]) {
        return e.json(200, { found: false });
    }
    const code = pendingOAuth[state].code;
    delete pendingOAuth[state]; // one-time retrieval
    return e.json(200, { found: true, code });
});
