/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay + server-side code store.

globalThis._lrOauth = globalThis._lrOauth || {};

// Extract query string via multiple strategies
function getRawQuery(e) {
    // Strategy 1: RequestURI contains full path?query (plain Go string field)
    try {
        var uri = String(e.request.RequestURI || e.request.requestURI || '');
        var q = uri.indexOf('?');
        if (q >= 0 && uri.length > q + 1) return uri.substring(q + 1);
    } catch(e1) {}

    // Strategy 2: url.RawQuery direct field
    try {
        var rq = e.request.url.RawQuery;
        if (rq && typeof rq === 'string' && rq.indexOf('=') >= 0) return rq;
    } catch(e2) {}

    // Strategy 3: url.search (JS URL-object style, strip leading ?)
    try {
        var s = String(e.request.url.search || '');
        if (s.length > 1) return s.charAt(0) === '?' ? s.substring(1) : s;
    } catch(e3) {}

    return '';
}

function parseParams(raw) {
    var result = { code: '', state: '', error: '' };
    if (!raw) return result;
    var parts = raw.split('&');
    for (var i = 0; i < parts.length; i++) {
        var idx = parts[i].indexOf('=');
        if (idx > 0) {
            var k = decodeURIComponent(parts[i].substring(0, idx));
            var v = decodeURIComponent(parts[i].substring(idx + 1).replace(/\+/g, ' '));
            if (k === 'code') result.code = v;
            else if (k === 'state') result.state = v;
            else if (k === 'error') result.error = v;
        }
    }
    return result;
}

routerAdd('GET', '/api/mobile-oauth-callback', function(e) {
    try {
        var codes = globalThis._lrOauth;
        var now = Date.now();
        for (var k in codes) {
            if (codes[k] && codes[k].expires < now) delete codes[k];
        }

        var raw = getRawQuery(e);
        var p = parseParams(raw);

        // Debug: expose what we received so we can diagnose
        if (!p.code || !p.state) {
            return e.json(200, {
                ok: false,
                error: p.error || 'missing_params',
                raw: raw,
                debug: {
                    hasReqURI: !!e.request.RequestURI,
                    reqURI: String(e.request.RequestURI || e.request.requestURI || 'n/a'),
                    urlType: typeof e.request.url,
                    rawQueryVal: String(e.request.url.RawQuery || 'n/a'),
                }
            });
        }

        codes[p.state] = { code: p.code, expires: Date.now() + 5 * 60 * 1000 };
        return e.json(200, { ok: true });

    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', function(e) {
    try {
        var codes = globalThis._lrOauth;
        var now = Date.now();
        for (var k in codes) {
            if (codes[k] && codes[k].expires < now) delete codes[k];
        }

        var raw = getRawQuery(e);
        var state = '';
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
