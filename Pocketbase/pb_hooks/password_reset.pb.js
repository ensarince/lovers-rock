/// <reference path="../pb_data/types.d.ts" />

// Password reset page for mobile users.
// Email template points to: {APP_URL}/api/mobile-reset-password?token={TOKEN}
// This page renders a form; the form submits via fetch to PocketBase's
// confirm-password-reset API directly from the browser.

routerAdd('GET', '/api/mobile-reset-password', function(e) {
    var token = '';
    try {
        var uri = String(e.request.URL ? e.request.URL.rawQuery || '' : '');
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
    } catch(_) {}

    if (!token) {
        return e.html(400,
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>' +
            '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
            '<title>Invalid Link — Take!</title>' +
            '<style>*{box-sizing:border-box;margin:0;padding:0}' +
            'body{background:#111827;color:#F3F5F8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
            'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}' +
            '.card{background:#1E2A3A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;' +
            'padding:48px 36px;text-align:center;max-width:400px;width:100%;}' +
            'h1{font-size:24px;font-weight:700;color:#FF2E63;margin-bottom:12px;}' +
            'p{font-size:15px;color:#AEB7C4;line-height:1.6;}</style>' +
            '</head><body><div class="card">' +
            '<h1>Invalid Link</h1>' +
            '<p>This password reset link is missing or invalid.<br/>Please request a new one from the app.</p>' +
            '</div></body></html>'
        );
    }

    var safeToken = token.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return e.html(200,
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        '<title>Reset Password — Take!</title>' +
        '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0}' +
        'body{background:#111827;color:#F3F5F8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
        'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}' +
        '.card{background:#1E2A3A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;' +
        'padding:48px 36px;text-align:center;max-width:400px;width:100%;}' +
        '.icon{font-size:48px;margin-bottom:20px;}' +
        'h1{font-size:26px;font-weight:700;color:#34D3CF;margin-bottom:8px;}' +
        '.subtitle{font-size:14px;color:#AEB7C4;margin-bottom:28px;line-height:1.5;}' +
        '.field{text-align:left;margin-bottom:16px;}' +
        'label{display:block;font-size:12px;font-weight:600;color:#AEB7C4;letter-spacing:0.5px;margin-bottom:6px;text-transform:uppercase;}' +
        'input{width:100%;padding:13px 16px;background:#111827;border:1.5px solid rgba(255,255,255,0.12);' +
        'border-radius:10px;color:#F3F5F8;font-size:15px;outline:none;transition:border-color 0.2s;}' +
        'input:focus{border-color:#FF2E63;}' +
        '.btn{width:100%;padding:14px;background:#FF2E63;color:#fff;border:none;border-radius:100px;' +
        'font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity 0.2s;}' +
        '.btn:hover{opacity:0.88}.btn:disabled{opacity:0.5;cursor:not-allowed;}' +
        '.error{color:#FF2E63;font-size:13px;margin-top:12px;display:none;}' +
        '.success{display:none;}' +
        '.success h1{color:#34D3CF;}' +
        '.open-btn{display:inline-block;margin-top:20px;background:#FF2E63;color:#fff;' +
        'padding:14px 32px;border-radius:100px;font-size:15px;font-weight:600;text-decoration:none;}' +
        '</style>' +
        '</head><body>' +
        '<div class="card">' +
        '<div id="form-view">' +
        '<div class="icon">🔒</div>' +
        '<h1>Set New Password</h1>' +
        '<p class="subtitle">Enter a new password for your Take! account.</p>' +
        '<div class="field"><label>New Password</label>' +
        '<input type="password" id="pw" placeholder="At least 8 characters" autocomplete="new-password"/></div>' +
        '<div class="field"><label>Confirm Password</label>' +
        '<input type="password" id="pw2" placeholder="Repeat new password" autocomplete="new-password"/></div>' +
        '<button class="btn" id="btn" onclick="submit()">Set New Password</button>' +
        '<p class="error" id="err"></p>' +
        '</div>' +
        '<div class="success" id="success-view">' +
        '<div class="icon">✓</div>' +
        '<h1>Password Updated!</h1>' +
        '<p class="subtitle">Your password has been changed.<br/>You can now sign in to Take! with your new password.</p>' +
        '<a href="loversrock://login" class="open-btn">Open Take!</a>' +
        '</div>' +
        '</div>' +
        '<script>' +
        'var TOKEN = ' + JSON.stringify(safeToken) + ';' +
        'function submit() {' +
        '  var pw = document.getElementById("pw").value;' +
        '  var pw2 = document.getElementById("pw2").value;' +
        '  var err = document.getElementById("err");' +
        '  var btn = document.getElementById("btn");' +
        '  err.style.display = "none";' +
        '  if (pw.length < 8) { err.textContent = "Password must be at least 8 characters."; err.style.display = "block"; return; }' +
        '  if (pw !== pw2) { err.textContent = "Passwords do not match."; err.style.display = "block"; return; }' +
        '  btn.disabled = true; btn.textContent = "Saving...";' +
        '  fetch("/api/collections/users/confirm-password-reset", {' +
        '    method: "POST",' +
        '    headers: { "Content-Type": "application/json" },' +
        '    body: JSON.stringify({ token: TOKEN, password: pw, passwordConfirm: pw2 })' +
        '  }).then(function(r) {' +
        '    if (r.ok) {' +
        '      document.getElementById("form-view").style.display = "none";' +
        '      document.getElementById("success-view").style.display = "block";' +
        '    } else {' +
        '      return r.json().then(function(d) {' +
        '        err.textContent = (d && d.message) || "Reset failed. The link may have expired.";' +
        '        err.style.display = "block";' +
        '        btn.disabled = false; btn.textContent = "Set New Password";' +
        '      });' +
        '    }' +
        '  }).catch(function() {' +
        '    err.textContent = "Network error. Please try again.";' +
        '    err.style.display = "block";' +
        '    btn.disabled = false; btn.textContent = "Set New Password";' +
        '  });' +
        '}' +
        'document.addEventListener("keydown", function(e) { if (e.key === "Enter") submit(); });' +
        '<\/script>' +
        '</body></html>'
    );
});
