/// <reference path="../pb_data/types.d.ts" />

// Enforces field-level access control on message updates.
// The collection updateRule only checks *who* can update — this hook checks *what*.
//   Receiver  → may only set: read
//   Sender    → may only set: reactions
// Any attempt to modify content, sender_id, receiver_id, etc. is rejected.
onRecordUpdateRequest((e) => {
    try {
        var authId = String((e.auth || {}).id || '');
        if (!authId) return e.next();

        var senderId   = String(e.record.get('sender_id')   || '');
        var receiverId = String(e.record.get('receiver_id') || '');

        var body = {};
        try {
            var info = e.requestInfo();
            body = info.body || info.data || {};
        } catch (_) {
            return e.next(); // can't read body — let updateRule be the gate
        }

        var systemFields = { id: 1, created: 1, updated: 1, collectionId: 1, collectionName: 1 };
        var keys = Object.keys(body).filter(function(k) { return !systemFields[k]; });
        if (keys.length === 0) return e.next();

        if (authId === receiverId) {
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] !== 'read') {
                    throw new Error('Receiver may only update the read field on a message');
                }
            }
        } else if (authId === senderId) {
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] !== 'reactions') {
                    throw new Error('Sender may only update reactions on a message');
                }
            }
        }
    } catch (err) {
        // Re-throw intentional field-guard rejections; swallow unexpected errors
        // so a hook bug never takes down the whole PocketBase process.
        if (String(err.message || '').indexOf('may only update') >= 0) {
            throw err;
        }
        console.error('[message_guard] unexpected hook error:', err);
    }
    return e.next();
}, 'messages');
