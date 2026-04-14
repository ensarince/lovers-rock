/// <reference path="../pb_data/types.d.ts" />

// Fix SSE buffering through Railway's Nginx proxy.
// routerUse fires BEFORE the handler writes any response, so headers can
// be set. onRealtimeConnectRequest fires after SSE streaming starts, so
// setting headers there throws on committed response -> 400.
routerUse((e) => {
    if (e.request.url.path.indexOf('/api/realtime') >= 0) {
        console.log('[sse_fix] setting unbuffered headers');
        e.response.header().set('X-Accel-Buffering', 'no');
        e.response.header().set('Cache-Control', 'no-cache');
        e.response.header().set('Connection', 'keep-alive');
    }
    return e.next();
});
