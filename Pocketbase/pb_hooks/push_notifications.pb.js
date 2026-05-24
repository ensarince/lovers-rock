/// <reference path="../pb_data/types.d.ts" />

function isExpoPushToken(pushToken) {
    if (!pushToken) return false;
    return (
        pushToken.indexOf('ExponentPushToken[') === 0 ||
        pushToken.indexOf('ExpoPushToken[') === 0
    );
}

function sendPush(pushToken, title, body, data, badgeCount) {
    if (!isExpoPushToken(pushToken)) return;

    var tokenPreview = pushToken.substring(0, 30) + '...';

    try {
        var response = $http.send({
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
                channelId: 'default',
                badge: badgeCount || 0,
            }),
            timeout: 15,
        });

        if (response.statusCode < 200 || response.statusCode >= 300) {
            console.error('[push] Expo push HTTP error ' + response.statusCode + ' for token ' + tokenPreview);
            return;
        }

        // Parse Expo ticket response to detect FCM-level errors
        try {
            var respBody = JSON.parse(response.body);
            var tickets = Array.isArray(respBody.data) ? respBody.data : (respBody.data ? [respBody.data] : []);
            tickets.forEach(function(ticket) {
                if (ticket.status === 'error') {
                    console.error('[push] Expo ticket error for ' + tokenPreview + ': ' + ticket.message + ' | details: ' + JSON.stringify(ticket.details || {}));
                } else if (ticket.id) {
                    console.log('[push] Expo ticket OK id=' + ticket.id + ' token=' + tokenPreview);
                }
            });
        } catch (parseErr) {
            console.log('[push] Expo responded ' + response.statusCode + ' (could not parse body) for token ' + tokenPreview);
        }
    } catch (err) {
        console.error('[push] Failed to send to ' + tokenPreview + ':', err);
    }
}

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

        var sender = $app.findRecordById('users', senderId);
        var senderName = String(sender.get('name') || 'Someone');
        var preview = content.length > 60 ? content.substring(0, 60) + '...' : content;

        sendPush(
            pushToken,
            senderName,
            preview || 'Sent you a message',
            { type: 'new_message', userId: senderId, userName: senderName, chatId: senderId },
            0
        );
    } catch (err) {
        console.error('[push] messages hook error:', err);
    }
    return e.next();
}, 'messages');

// New like -> partner request + match notifications
onRecordAfterCreateSuccess((e) => {
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
                'from_user = "' + toUser + '" && to_user = "' + fromUser + '" && intent = "' + intent + '"',
                '-created',
                1,
                0
            );
            if (results && results.length > 0) reciprocal = results[0];
        } catch (err) {}

        if (reciprocal) {
            var user1 = $app.findRecordById('users', fromUser);
            var user2 = $app.findRecordById('users', toUser);
            var token1 = String(user1.get('push_token') || '');
            var token2 = String(user2.get('push_token') || '');
            var name1 = String(user1.get('name') || 'Someone');
            var name2 = String(user2.get('name') || 'Someone');

            if (intent === 'dating') {
                if (token1) sendPush(token1, "It's a Match!", 'You matched with ' + name2 + '!', { type: 'dating_match', userId: toUser, userName: name2 }, 0);
                if (token2) sendPush(token2, "It's a Match!", 'You matched with ' + name1 + '!', { type: 'dating_match', userId: fromUser, userName: name1 }, 0);
            } else if (intent === 'partner') {
                if (token1) sendPush(token1, 'Climbing Partner Match!', name2 + ' accepted your climbing partner request!', { type: 'partner_match', userId: toUser, userName: name2 }, 0);
                if (token2) sendPush(token2, 'Climbing Partner Match!', 'You have a mutual climbing partner match with ' + name1 + '!', { type: 'partner_match', userId: fromUser, userName: name1 }, 0);
            }
        } else if (intent === 'partner') {
            try {
                var receiver = $app.findRecordById('users', toUser);
                var receiverToken = String(receiver.get('push_token') || '');
                if (receiverToken) {
                    var sender = $app.findRecordById('users', fromUser);
                    var senderName = String(sender.get('name') || 'Someone');
                    sendPush(
                        receiverToken,
                        'New Climbing Partner Request',
                        senderName + ' wants to climb with you!',
                        { type: 'partner_request', userId: fromUser, userName: senderName },
                        0
                    );
                }
            } catch (err) {}
        }
    } catch (err) {
        console.error('[push] likes hook error:', err);
    }
    return e.next();
}, 'likes');
