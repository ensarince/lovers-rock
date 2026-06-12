/// <reference path="../pb_data/types.d.ts" />

// Enforces the "match before message" rule at the API level.
// The messages createRule only checks sender_id = @request.auth.id — it does not
// verify that a mutual match (reciprocal likes) exists. Without this hook, any
// authenticated user can message any other user directly via the API.
//
// Logic: allow the message if at least one intent (dating OR partner) has a
// mutual like in both directions. Internal/admin SDK calls (e.auth == null) are
// always allowed through so hook-created messages (e.g. system notifications) work.
onRecordCreateRequest((e) => {
    try {
        // No auth = internal hook / admin SDK call — skip match check
        if (!e.auth) return e.next();

        var senderId   = String(e.record.get('sender_id')   || '');
        var receiverId = String(e.record.get('receiver_id') || '');

        if (!senderId || !receiverId || senderId === receiverId) return e.next();

        function safeId(id) {
            return String(id).replace(/[^a-zA-Z0-9]/g, '');
        }

        var hasMatch = false;
        var intents  = ['dating', 'partner'];

        for (var i = 0; i < intents.length && !hasMatch; i++) {
            var intent = intents[i];
            try {
                var outgoing = $app.findRecordsByFilter(
                    'likes',
                    'from_user = "' + safeId(senderId)   + '" && ' +
                    'to_user   = "' + safeId(receiverId) + '" && ' +
                    'intent    = "' + intent + '"',
                    '-created', 1, 0
                );
                if (outgoing.length > 0) {
                    var incoming = $app.findRecordsByFilter(
                        'likes',
                        'from_user = "' + safeId(receiverId) + '" && ' +
                        'to_user   = "' + safeId(senderId)   + '" && ' +
                        'intent    = "' + intent + '"',
                        '-created', 1, 0
                    );
                    if (incoming.length > 0) hasMatch = true;
                }
            } catch (_) {}
        }

        if (!hasMatch) {
            throw new Error('Cannot send message without a mutual match');
        }
    } catch (err) {
        if (String(err.message || '').indexOf('mutual match') >= 0) throw err;
        // Unexpected DB / hook error: log and fail open so a hook bug never
        // silently breaks chat for matched users.
        console.error('[message_match_guard] unexpected error:', String(err));
    }
    return e.next();
}, 'messages');
