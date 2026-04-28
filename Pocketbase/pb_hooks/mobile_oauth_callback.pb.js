/// <reference path="../pb_data/types.d.ts" />

routerAdd('GET', '/api/mobile-oauth-callback', function(e) {
    try {
        var now = Date.now();
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

        if (errParam) {
            var errLink = 'loversrock://oauth?error=' + encodeURIComponent(errParam);
            return e.html(200,
                '<!DOCTYPE html><html><head><title>Auth error</title>' +
                '<script>window.location=' + JSON.stringify(errLink) + ';<\/script>' +
                '</head><body>Auth error — redirecting to app...</body></html>'
            );
        }
        if (!code || !state) return e.json(200, { ok: false, error: 'missing_params' });

        // Backup: store for poll path (best-effort — ignore if $app.store() unavailable)
        try { $app.store().set('_lr_' + state, JSON.stringify({ code: code, exp: now + 300000 })); } catch(se) {}

        // Primary: HTML page that redirects Chrome back into the app via deep link
        var deepLink = 'loversrock://oauth?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state);
        return e.html(200,
            '<!DOCTYPE html><html><head><title>Signing in...</title>' +
            '<script>window.location=' + JSON.stringify(deepLink) + ';<\/script>' +
            '</head><body>Redirecting to Lovers Rock...</body></html>'
        );
    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});

routerAdd('GET', '/api/oauth-code-poll', function(e) {
    try {
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

        if (!state) return e.json(200, { found: false });

        var stored = null;
        try { stored = $app.store().get('_lr_' + state); } catch(se) {}
        if (!stored) return e.json(200, { found: false });

        var entry = JSON.parse(String(stored));
        if (entry.exp < Date.now()) {
            try { $app.store().remove('_lr_' + state); } catch(se) {}
            return e.json(200, { found: false });
        }

        try { $app.store().remove('_lr_' + state); } catch(se) {}
        return e.json(200, { found: true, code: entry.code });
    } catch(err) {
        return e.json(500, { error: String(err) });
    }
});
