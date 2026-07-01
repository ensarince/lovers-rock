/// <reference path="../pb_data/types.d.ts" />

// Prevents image spam: max 20 image messages per user per hour.
// GIFs store only a URL (no file upload) so they bypass this check.
// Internal/admin SDK calls (e.auth == null) are always allowed through.
onRecordCreateRequest((e) => {
    try {
        if (!e.auth) return e.next();

        var msgType = String(e.record.get('message_type') || 'text');
        if (msgType !== 'image') return e.next();

        var senderId = String(e.record.get('sender_id') || '');
        if (!senderId) return e.next();

        function safeId(id) {
            return String(id).replace(/[^a-zA-Z0-9]/g, '');
        }

        var oneHourAgo = new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19);

        var recent = $app.findRecordsByFilter(
            'messages',
            'sender_id = "' + safeId(senderId) + '" && message_type = "image" && created >= "' + oneHourAgo + '"',
            '-created', 21, 0
        );

        if (recent.length >= 20) {
            throw new Error('Media rate limit: max 20 images per hour');
        }
    } catch (err) {
        if (String(err.message || '').indexOf('Media rate limit') >= 0) throw err;
        console.error('[media_rate_limit] unexpected error:', String(err));
    }
    return e.next();
}, 'messages');
