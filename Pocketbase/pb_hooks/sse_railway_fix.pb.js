/// <reference path="../pb_data/types.d.ts" />

// Fix 1: Prevent Railway's Nginx from buffering the SSE response.
// routerUse fires before the handler writes anything, so headers can be set safely.
routerUse((e) => {
    if (e.request.url.path.indexOf('/api/realtime') >= 0) {
        e.response.header().set('X-Accel-Buffering', 'no');
        e.response.header().set('Cache-Control', 'no-cache');
        e.response.header().set('Connection', 'keep-alive');
    }
    return e.next();
});

// Fix 2: Extend the SSE idle timeout from PocketBase's default (~5s) to 5 minutes.
// The OAuth flow takes longer than 5s (user has to interact with Google's UI).
// Without this, the SSE subscription expires before the OAuth callback arrives,
// invalidating the state and causing "Auth failed".
// idleTimeout is time.Duration (int64 nanoseconds). Must be set before connect.
onRealtimeConnectRequest((e) => {
    e.idleTimeout = 5 * 60 * 1000 * 1000 * 1000; // 5 minutes in nanoseconds
    return e.next();
});
