/// <reference path="../pb_data/types.d.ts" />

globalThis._lrOauth = globalThis._lrOauth || {};

routerAdd('GET', '/api/mobile-oauth-callback', function(e) {
    try {
        var codes = globalThis._lrOauth;
        var now = Date.now();
        for (var k in codes) { if (codes[k] && codes[k].expires < now) delete codes[k]; }

        var code = '', state = '', errParam = '';
        try {
            var uri = String(e.request.RequestURI || e.request.requestURI || '');
            var q = uri.indexOf('?');
            var raw = q >= 0 ? uri.substring(q + 1) : '';
            var parts = raw.split('&');
            for (var i = 0; i < parts.length; i++) {
                var idx = parts[i].indexOf('=');
                if (idx > 0) {
                    var pk = decodeURIComponent(parts[i].substring(0, idx));
                    var pv = decodeURIComponent(parts[i].substring(idx + 1).replace(/\+/g, ' '));
                    if (pk === 'code') code = pv;
                    else if (pk === 'state') state = pv;
                    else if (pk === 'error') errParam = pv;
                }
            }
        } catch(pe) {}

        if (errParam) return e.json(200, { ok: false, error: errParam });
        if (!code || !state) return e.json(200, { ok: false, error: 'missing_params' });

        codes[state] = { code: code, expires: Date.now() + 5 * 60 * 1000 };
        return e.json(200, { ok: true });
    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', function(e) {
    try {
        var codes = globalThis._lrOauth;
        var now = Date.now();
        for (var k in codes) { if (codes[k] && codes[k].expires < now) delete codes[k]; }

        var state = '';
        try {
            var uri = String(e.request.RequestURI || e.request.requestURI || '');
            var q = uri.indexOf('?');
            var raw = q >= 0 ? uri.substring(q + 1) : '';
            var parts = raw.split('&');
            for (var i = 0; i < parts.length; i++) {
                var idx = parts[i].indexOf('=');
                if (idx > 0 && decodeURIComponent(parts[i].substring(0, idx)) === 'state') {
                    state = decodeURIComponent(parts[i].substring(idx + 1));
                    break;
                }
            }
        } catch(pe) {}

        if (!state || !codes[state]) return e.json(200, { found: false });
        var code = codes[state].code;
        delete codes[state];
        return e.json(200, { found: true, code: code });
    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});
