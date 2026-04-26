/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.
//
// Google redirects here → code stored in memory → app retrieves via poll.
// The browser shows a plain JSON response; the app receives the code via
// /api/oauth-code-poll polling and completes auth independently.
//
// Uses var (not const/let) — goja does not always close over module-level
// const declarations in routerAdd callbacks.

var _oauthPending = {};

routerAdd('GET', '/api/mobile-oauth-callback', function(e) {
    try {
        // Cleanup expired entries
        var now = Date.now();
        for (var k in _oauthPending) {
            if (_oauthPending[k] && _oauthPending[k].expires < now) {
                delete _oauthPending[k];
            }
        }

        // Parse query params from raw URL string (avoids Go method calls)
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
            return e.json(200, { ok: false, error: 'missing_params' });
        }

        // Store code for polling (5-minute TTL)
        _oauthPending[state] = { code: code, expires: Date.now() + 5 * 60 * 1000 };

        // Return success — app will pick up the code via /api/oauth-code-poll
        return e.json(200, { ok: true });

    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', function(e) {
    try {
        // Cleanup expired entries
        var now = Date.now();
        for (var k in _oauthPending) {
            if (_oauthPending[k] && _oauthPending[k].expires < now) {
                delete _oauthPending[k];
            }
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

        if (!state || !_oauthPending[state]) {
            return e.json(200, { found: false });
        }
        var code = _oauthPending[state].code;
        delete _oauthPending[state];
        return e.json(200, { found: true, code: code });

    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});
