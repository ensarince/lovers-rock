/// <reference path="../pb_data/types.d.ts" />

// New message -> notify receiver
onRecordAfterCreateSuccess((e) => {
    try {
        var msg = e.record;
        var senderId = String(msg.get('sender_id') || '');
        var receiverId = String(msg.get('receiver_id') || '');
        var content = String(msg.get('content') || '');

        if (!senderId || !receiverId || senderId === receiverId) return e.next();

        var receiver = $app.findRecordById('users', receiverId);
        var pushToken = String(receiver.get('push_token') || '');
        if (!pushToken) return e.next();
        if (pushToken.indexOf('ExponentPushToken[') !== 0 && pushToken.indexOf('ExpoPushToken[') !== 0) return e.next();

        var sender = $app.findRecordById('users', senderId);
        var senderName = String(sender.get('name') || 'Someone');
        var preview = content.length > 60 ? content.substring(0, 60) + '...' : content;

        var tokenPreview = pushToken.substring(0, 30) + '...';
        try {
            var response = $http.send({
                url: 'https://exp.host/--/api/v2/push/send',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    to: pushToken,
                    title: senderName,
                    body: preview || 'Sent you a message',
                    data: { type: 'new_message', userId: senderId, userName: senderName, chatId: senderId },
                    sound: 'default',
                    priority: 'high',
                    channelId: 'default',
                    badge: 0,
                }),
                timeout: 15,
            });
            if (response.statusCode >= 200 && response.statusCode < 300) {
                try {
                    var rb = JSON.parse(response.body);
                    var tickets = Array.isArray(rb.data) ? rb.data : (rb.data ? [rb.data] : []);
                    tickets.forEach(function(t) {
                        if (t.status === 'error') {
                            console.error('[push] message ticket error for ' + tokenPreview + ': ' + t.message);
                        } else {
                            console.log('[push] message ticket OK id=' + t.id);
                        }
                    });
                } catch (_) {}
            } else {
                console.error('[push] message HTTP ' + response.statusCode + ' for ' + tokenPreview);
            }
        } catch (httpErr) {
            console.error('[push] message HTTP error for ' + tokenPreview + ':', httpErr);
        }
    } catch (err) {
        console.error('[push] messages hook error:', err);
    }
    return e.next();
}, 'messages');

// New like -> partner request + match notifications
onRecordAfterCreateSuccess((e) => {
    function safeId(val) {
        return String(val || '').replace(/[^a-zA-Z0-9]/g, '');
    }
    function validToken(t) {
        return t && (t.indexOf('ExponentPushToken[') === 0 || t.indexOf('ExpoPushToken[') === 0);
    }
    function sendExpoPush(pushToken, title, body, data) {
        try {
            var r = $http.send({
                url: 'https://exp.host/--/api/v2/push/send',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    to: pushToken,
                    title: title,
                    body: body,
                    data: data || {},
                    sound: 'default',
                    priority: 'high',
                    channelId: 'default',
                    badge: 0,
                }),
                timeout: 15,
            });
            if (r.statusCode >= 200 && r.statusCode < 300) {
                try {
                    var rb = JSON.parse(r.body);
                    var tickets = Array.isArray(rb.data) ? rb.data : (rb.data ? [rb.data] : []);
                    tickets.forEach(function(t) {
                        if (t.status === 'error') {
                            console.error('[push] likes ticket error: ' + t.message);
                        } else {
                            console.log('[push] likes ticket OK id=' + t.id);
                        }
                    });
                } catch (_) {}
            } else {
                console.error('[push] likes HTTP ' + r.statusCode);
            }
        } catch (err) {
            console.error('[push] likes HTTP error:', err);
        }
    }

    try {
        var like = e.record;
        var fromUser = String(like.get('from_user') || '');
        var toUser = String(like.get('to_user') || '');
        var intent = String(like.get('intent') || '');

        if (!fromUser || !toUser) return e.next();

        var reciprocal = null;
        try {
            var results = $app.findRecordsByFilter(
                'likes',
                'from_user = "' + safeId(toUser) + '" && to_user = "' + safeId(fromUser) + '" && intent = "' + safeId(intent) + '"',
                '-created', 1, 0
            );
            if (results && results.length > 0) reciprocal = results[0];
        } catch (_) {}

        if (reciprocal) {
            var user1 = $app.findRecordById('users', fromUser);
            var user2 = $app.findRecordById('users', toUser);
            var token1 = String(user1.get('push_token') || '');
            var token2 = String(user2.get('push_token') || '');
            var name1 = String(user1.get('name') || 'Someone');
            var name2 = String(user2.get('name') || 'Someone');

            if (intent === 'dating') {
                if (validToken(token1)) sendExpoPush(token1, "It's a Match!", 'You matched with ' + name2 + '!', { type: 'dating_match', userId: toUser, userName: name2 });
                if (validToken(token2)) sendExpoPush(token2, "It's a Match!", 'You matched with ' + name1 + '!', { type: 'dating_match', userId: fromUser, userName: name1 });
            } else if (intent === 'partner') {
                if (validToken(token1)) sendExpoPush(token1, 'Climbing Partner Match!', name2 + ' accepted your partner request!', { type: 'partner_match', userId: toUser, userName: name2 });
                if (validToken(token2)) sendExpoPush(token2, 'Climbing Partner Match!', 'You have a mutual partner match with ' + name1 + '!', { type: 'partner_match', userId: fromUser, userName: name1 });
            }
        } else if (intent === 'partner') {
            try {
                var receiver = $app.findRecordById('users', toUser);
                var receiverToken = String(receiver.get('push_token') || '');
                if (validToken(receiverToken)) {
                    var sender = $app.findRecordById('users', fromUser);
                    var senderName = String(sender.get('name') || 'Someone');
                    sendExpoPush(receiverToken, 'New Climbing Partner Request', senderName + ' wants to climb with you!', { type: 'partner_request', userId: fromUser, userName: senderName });
                }
            } catch (_) {}
        }
    } catch (err) {
        console.error('[push] likes hook error:', err);
    }
    return e.next();
}, 'likes');
