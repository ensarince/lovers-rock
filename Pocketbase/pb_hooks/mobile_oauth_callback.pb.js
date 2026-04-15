/// <reference path="../pb_data/types.d.ts" />

// Mobile OAuth callback relay.
//
// Google OAuth on Android requires an HTTPS redirect URI (custom schemes like
// loversrock:// are rejected for Web application clients). This route acts as
// a relay: Google redirects here, and we immediately 302 to the app's deep
// link so Chrome Custom Tabs auto-close and return the code to the app.
//
// Authorized redirect URI to add in Google Cloud Console:
//   https://<your-railway-domain>/api/mobile-oauth-callback
//
routerAdd('GET', '/api/mobile-oauth-callback', (e) => {
    const code  = e.request.url.query().get('code');
    const state = e.request.url.query().get('state');
    const error = e.request.url.query().get('error');

    if (error) {
        return e.redirect(302, 'loversrock://oauth?error=' + encodeURIComponent(error));
    }

    if (!code || !state) {
        return e.redirect(302, 'loversrock://oauth?error=missing_params');
    }

    const deepLink = 'loversrock://oauth'
        + '?code='  + encodeURIComponent(code)
        + '&state=' + encodeURIComponent(state);

    return e.redirect(302, deepLink);
});
