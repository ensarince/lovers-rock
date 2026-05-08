/// <reference path="../pb_data/types.d.ts" />

function sendPush(pushToken, title, body, data) {
    if (!pushToken || pushToken.indexOf('ExponentPushToken') !== 0) return;
    try {
        $http.send({
            url: 'https://exp.host/--/api/v2/push/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title: title,
                body: body,
                data: data || {},
                sound: 'default',
                priority: 'high',
            }),
            timeout: 10,
        });
    } catch(err) {
        console.error('[push] Failed to send to ' + pushToken + ':', err);
    }
}

// ── New message → notify receiver ─────────────────────────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        var msg = e.record;
        var senderId   = String(msg.get('sender_id')   || '');
        var receiverId = String(msg.get('receiver_id') || '');
        var content    = String(msg.get('content')     || '');

        if (!senderId || !receiverId || senderId === receiverId) return e.next();

        var receiver = $app.findRecordById('users', receiverId);
        var pushToken = String(receiver.get('push_token') || '');
        if (!pushToken) return e.next();

        var sender = $app.findRecordById('users', senderId);
        var senderName = String(sender.get('name') || 'Someone');
        var preview = content.length > 60 ? content.substring(0, 60) + '…' : content;

        sendPush(
            pushToken,
            '💬 ' + senderName,
            preview,
            { type: 'new_message', userId: senderId, chatId: senderId }
        );
    } catch(err) {
        // user not found or no token — ignore
    }
    return e.next();
}, 'messages');

// ── New like → partner request + match notifications ──────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        var like     = e.record;
        var fromUser = String(like.get('from_user') || '');
        var toUser   = String(like.get('to_user')   || '');
        var intent   = String(like.get('intent')    || '');

        if (!fromUser || !toUser) return e.next();

        // Check if a reciprocal like already exists → mutual match
        var reciprocal = null;
        try {
            var results = $app.findRecordsByFilter(
                'likes',
                'from_user = "' + toUser + '" && to_user = "' + fromUser + '" && intent = "' + intent + '"',
                '-created',
                1,
                0
            );
            if (results && results.length > 0) reciprocal = results[0];
        } catch(e) { /* not found */ }

        if (reciprocal) {
            // ── Mutual match ─────────────────────────────────────────────
            var user1 = $app.findRecordById('users', fromUser);
            var user2 = $app.findRecordById('users', toUser);
            var token1 = String(user1.get('push_token') || '');
            var token2 = String(user2.get('push_token') || '');
            var name1  = String(user1.get('name') || 'Someone');
            var name2  = String(user2.get('name') || 'Someone');

            if (intent === 'dating') {
                if (token1) sendPush(token1, '❤️ It\'s a Match!', 'You matched with ' + name2 + '!', { type: 'dating_match', userId: toUser, userName: name2 });
                if (token2) sendPush(token2, '❤️ It\'s a Match!', 'You matched with ' + name1 + '!', { type: 'dating_match', userId: fromUser, userName: name1 });
            } else if (intent === 'partner') {
                // fromUser just liked back → accepted toUser's earlier request
                if (token1) sendPush(token1, '🤝 Partner Match!', name2 + ' accepted your partner request!', { type: 'partner_match', userId: toUser, userName: name2 });
                if (token2) sendPush(token2, '🤝 Partner Match!', 'You have a mutual partner match with ' + name1 + '!', { type: 'partner_match', userId: fromUser, userName: name1 });
            }
        } else if (intent === 'partner') {
            // ── New partner request (no match yet) ───────────────────────
            try {
                var receiver = $app.findRecordById('users', toUser);
                var receiverToken = String(receiver.get('push_token') || '');
                if (receiverToken) {
                    var sender = $app.findRecordById('users', fromUser);
                    var senderName = String(sender.get('name') || 'Someone');
                    sendPush(
                        receiverToken,
                        '🧗 New Partner Request',
                        senderName + ' wants to climb with you!',
                        { type: 'partner_request', userId: fromUser, userName: senderName }
                    );
                }
            } catch(e) { /* user not found */ }
        }
        // dating with no reciprocal → silent (anonymous likes)
    } catch(err) {
        console.error('[push] likes hook error:', err);
    }
    return e.next();
}, 'likes');
