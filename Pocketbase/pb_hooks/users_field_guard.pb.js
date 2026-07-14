/// <reference path="../pb_data/types.d.ts" />

// Prevents users from self-assigning admin-controlled fields on their own record.
// The users updateRule (id = @request.auth.id) controls *who* can update but not
// *which fields* — this hook enforces field-level restrictions for user-initiated
// requests. Internal/admin SDK calls (e.auth == null) are always allowed through.
onRecordUpdateRequest((e) => {
    try {
        var info = e.requestInfo();

        // No auth = internal hook / admin SDK call — skip
        if (!e.auth) return e.next();
        // PocketBase < 0.23: admin object is separate from auth
        if (info.admin) return e.next();
        // PocketBase >= 0.23: admins are superusers in _superusers collection
        try {
            if (e.auth.collection && e.auth.collection().name === '_superusers') return e.next();
        } catch (_) {}

        var body = info.body || info.data || {};

        if (Object.prototype.hasOwnProperty.call(body, 'verified')) {
            throw new Error('Field "verified" is read-only for users');
        }
    } catch (err) {
        if (String(err.message || '').indexOf('read-only') >= 0) throw err;
        console.error('[users_guard] unexpected error:', String(err));
    }
    return e.next();
}, 'users');
