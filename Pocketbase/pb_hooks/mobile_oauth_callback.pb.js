/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.
//
// Flow:
//   Google → GET /api/mobile-oauth-callback → code stored + HTML page JS-redirects to loversrock://oauth
//   App polls GET /api/oauth-code-poll?state=xxx every 1.5 s
//
// Query params are parsed from RawQuery manually — e.request.url.query().get()
// throws in PocketBase v0.26.5 JSVM because Go method names are PascalCase.

const pendingOAuth = {};

function cleanup() {
    const now = Date.now();
    for (const k in pendingOAuth) {
        if (pendingOAuth[k].expires < now) delete pendingOAuth[k];
    }
}

// Parse a single query param from the raw query string
function qp(e, key) {
    try {
        const raw = e.request.url.RawQuery || e.request.url.rawQuery || '';
        const parts = raw.split('&');
        for (let i = 0; i < parts.length; i++) {
            const idx = parts[i].indexOf('=');
            if (idx > 0) {
                const k = decodeURIComponent(parts[i].substring(0, idx));
                if (k === key) {
                    return decodeURIComponent(parts[i].substring(idx + 1).replace(/\+/g, ' '));
                }
            }
        }
    } catch (err) {}
    return '';
}

routerAdd('GET', '/api/mobile-oauth-callback', (e) => {
    try {
        cleanup();
        const code  = qp(e, 'code');
        const state = qp(e, 'state');
        const error = qp(e, 'error');

        let deepLink;
        if (error) {
            deepLink = 'loversrock://oauth?error=' + encodeURIComponent(error);
        } else if (!code || !state) {
            deepLink = 'loversrock://oauth?error=missing_params';
        } else {
            pendingOAuth[state] = { code: code, expires: Date.now() + 5 * 60 * 1000 };
            deepLink = 'loversrock://oauth?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state);
        }

        return e.html(200,
            '<!DOCTYPE html><html><head>' +
            '<script>window.location.replace("' + deepLink + '")</script>' +
            '<meta http-equiv="refresh" content="0;url=' + deepLink + '">' +
            '</head><body><p>Redirecting back to Lovers Rock…</p></body></html>'
        );
    } catch (err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', (e) => {
    try {
        cleanup();
        const state = qp(e, 'state');
        if (!state || !pendingOAuth[state]) {
            return e.json(200, { found: false });
        }
        const code = pendingOAuth[state].code;
        delete pendingOAuth[state];
        return e.json(200, { found: true, code: code });
    } catch (err) {
        return e.json(500, { error: String(err) });
    }
});
