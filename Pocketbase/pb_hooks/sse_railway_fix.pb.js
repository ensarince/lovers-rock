/// <reference path="../pb_data/types.d.ts" />

// Fix SSE buffering through Railway's Nginx proxy.
// Without X-Accel-Buffering: no, Railway buffers SSE messages and the
// authWithOAuth2 state is destroyed before the user finishes Google auth.

// Approach 1: middleware on every /api/realtime request
routerUse((e) => {
    if (e.request.url.path.indexOf('/api/realtime') >= 0) {
        console.log('[sse_fix] setting unbuffered headers for realtime connection');
        e.response.header().set('X-Accel-Buffering', 'no');
        e.response.header().set('Cache-Control', 'no-cache');
        e.response.header().set('Connection', 'keep-alive');
    }
    return e.next();
});

// Approach 2: dedicated realtime connect hook (fires specifically on SSE connect)
onRealtimeConnectRequest((e) => {
    console.log('[sse_fix] onRealtimeConnectRequest fired');
    e.response.header().set('X-Accel-Buffering', 'no');
    e.response.header().set('Cache-Control', 'no-cache');
    e.response.header().set('Connection', 'keep-alive');
    return e.next();
});
