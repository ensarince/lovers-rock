/// <reference path="../pb_data/types.d.ts" />

// Custom email verification endpoint for the mobile app.
// PocketBase's default verification link opens the admin UI (/_/#/auth/confirm-verification/TOKEN)
// which is useless for mobile users. This endpoint instead:
//   1. Confirms the verification token server-side
//   2. Redirects to the app via deep link (loversrock://verified)
//
// The email template must point here: {APP_URL}/api/mobile-verify-email?token={TOKEN}

routerAdd('GET', '/api/mobile-verify-email', function(e) {
    var token = '';
    try {
        var uri = String(e.request.URL ? e.request.URL.rawQuery || '' : '');
        // fallback: parse from RequestURI
        if (!uri) {
            var full = String(e.request.RequestURI || e.request.requestURI || '');
            var q = full.indexOf('?');
            uri = q >= 0 ? full.substring(q + 1) : '';
        }
        var parts = uri.split('&');
        for (var i = 0; i < parts.length; i++) {
            var idx = parts[i].indexOf('=');
            if (idx > 0) {
                var k = decodeURIComponent(parts[i].substring(0, idx));
                var v = decodeURIComponent(parts[i].substring(idx + 1).replace(/\+/g, ' '));
                if (k === 'token') { token = v; break; }
            }
        }
    } catch(parseErr) {}

    var successHtml = function() {
        var deepLink = 'loversrock://verified';
        return e.html(200,
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>' +
            '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
            '<title>Email Verified — Take!</title>' +
            '<style>' +
            '*{box-sizing:border-box;margin:0;padding:0}' +
            'body{background:#111827;color:#F3F5F8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
            'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}' +
            '.card{background:#1E2A3A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;' +
            'padding:48px 36px;text-align:center;max-width:400px;width:100%;}' +
            '.icon{font-size:56px;margin-bottom:20px;}' +
            'h1{font-size:28px;font-weight:700;color:#34D3CF;margin-bottom:12px;}' +
            'p{font-size:15px;color:#AEB7C4;line-height:1.6;margin-bottom:24px;}' +
            '.btn{display:inline-block;background:#FF2E63;color:#fff;padding:14px 32px;' +
            'border-radius:100px;font-size:15px;font-weight:600;text-decoration:none;' +
            'transition:opacity 0.2s;}' +
            '.btn:hover{opacity:0.85}' +
            '</style>' +
            '<script>setTimeout(function(){ window.location=' + JSON.stringify(deepLink) + '; }, 1500);<\/script>' +
            '</head><body>' +
            '<div class="card">' +
            '<div class="icon">✓</div>' +
            '<h1>Email Verified!</h1>' +
            '<p>Your Take! account is confirmed.<br/>Opening the app now...</p>' +
            '<a href="' + deepLink + '" class="btn">Open Take!</a>' +
            '</div>' +
            '</body></html>'
        );
    };

    var errorHtml = function(msg) {
        return e.html(400,
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>' +
            '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
            '<title>Verification Failed — Take!</title>' +
            '<style>' +
            '*{box-sizing:border-box;margin:0;padding:0}' +
            'body{background:#111827;color:#F3F5F8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
            'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}' +
            '.card{background:#1E2A3A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;' +
            'padding:48px 36px;text-align:center;max-width:400px;width:100%;}' +
            '.icon{font-size:56px;margin-bottom:20px;}' +
            'h1{font-size:28px;font-weight:700;color:#FF2E63;margin-bottom:12px;}' +
            'p{font-size:15px;color:#AEB7C4;line-height:1.6;}' +
            '</style>' +
            '</head><body>' +
            '<div class="card">' +
            '<div class="icon">✕</div>' +
            '<h1>Verification Failed</h1>' +
            '<p>' + msg + '</p>' +
            '</div>' +
            '</body></html>'
        );
    };

    if (!token) {
        return errorHtml('Invalid or missing verification link.');
    }

    try {
        // Call PocketBase's own confirm-verification API internally
        var result = $http.send({
            url: 'http://127.0.0.1:8080/api/collections/users/confirm-verification',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token }),
            timeout: 10,
        });

        if (result.statusCode >= 200 && result.statusCode < 300) {
            return successHtml();
        } else {
            return errorHtml('The link may have expired. Please register again or contact support.');
        }
    } catch(err) {
        return errorHtml('Something went wrong. Please try again or contact takeclimbingapp@gmail.com');
    }
});
