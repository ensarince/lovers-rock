/// <reference path="../pb_data/types.d.ts" />

// Fix SSE buffering through Railway's Nginx proxy.
// Railway buffers HTTP responses by default. PocketBase's authWithOAuth2 flow
// delivers the OAuth result via SSE on /api/realtime — if Nginx buffers it,
// the mobile app's authWithOAuth2 promise never resolves even though the
// browser shows "Auth completed".
// X-Accel-Buffering: no disables Nginx buffering for this response.
routerUse((e) => {
    if (e.request.url.path.indexOf('/api/realtime') >= 0) {
        e.response.header().set('X-Accel-Buffering', 'no');
        e.response.header().set('Cache-Control', 'no-cache');
    }
    return e.next();
});
