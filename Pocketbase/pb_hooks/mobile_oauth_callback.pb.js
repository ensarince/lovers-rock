/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.
//
// Google redirects here → code stored → app retrieves via /api/oauth-code-poll.
//
// globalThis is used for shared state: goja runs each routerAdd callback in an
// isolated context, so module-level var/const are not captured by closures.
// globalThis is the one object that persists across all handler invocations.

globalThis._lrOauth = globalThis._lrOauth || {};

routerAdd('GET', '/api/mobile-oauth-callback', function(e) {
    try {
        var codes = globalThis._lrOauth;

        // Cleanup expired entries
        var now = Date.now();
        for (var k in codes) {
            if (codes[k] && codes[k].expires < now) delete codes[k];
        }

        // Parse query params from raw URL string
        var code = '', state = '', errParam = '';
        var raw = '';
        try { raw = String(e.request.url.RawQuery || ''); } catch(e1) {
            try { raw = String(e.request.url.rawQuery || ''); } catch(e2) {}
        }
        var parts = raw.split('&');
        for (var i = 0; i < parts.length; i++) {
            var idx = parts[i].indexOf('=');
            if (idx > 0) {
                var pk = decodeURIComponent(parts[i].substring(0, idx));
                var pv = decodeURIComponent(parts[i].substring(idx + 1).replace(/\+/g, ' '));
                if (pk === 'code') { code = pv; }
                else if (pk === 'state') { state = pv; }
                else if (pk === 'error') { errParam = pv; }
            }
        }

        if (errParam) {
            return e.json(200, { ok: false, error: errParam });
        }
        if (!code || !state) {
            return e.json(200, { ok: false, error: 'missing_params', raw: raw });
        }

        codes[state] = { code: code, expires: Date.now() + 5 * 60 * 1000 };
        return e.json(200, { ok: true });

    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', function(e) {
    try {
        var codes = globalThis._lrOauth;

        // Cleanup expired entries
        var now = Date.now();
        for (var k in codes) {
            if (codes[k] && codes[k].expires < now) delete codes[k];
        }

        // Parse state param
        var state = '';
        var raw = '';
        try { raw = String(e.request.url.RawQuery || ''); } catch(e1) {
            try { raw = String(e.request.url.rawQuery || ''); } catch(e2) {}
        }
        var parts = raw.split('&');
        for (var i = 0; i < parts.length; i++) {
            var idx = parts[i].indexOf('=');
            if (idx > 0 && decodeURIComponent(parts[i].substring(0, idx)) === 'state') {
                state = decodeURIComponent(parts[i].substring(idx + 1));
                break;
            }
        }

        if (!state || !codes[state]) {
            return e.json(200, { found: false });
        }
        var code = codes[state].code;
        delete codes[state];
        return e.json(200, { found: true, code: code });

    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});
