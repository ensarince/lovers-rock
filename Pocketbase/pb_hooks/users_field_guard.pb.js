/// <reference path="../pb_data/types.d.ts" />

// Prevents users from self-assigning admin-controlled fields on their own record.
// The users updateRule (id = @request.auth.id) controls *who* can update but not
// *which fields* — this hook enforces field-level restrictions for user-initiated
// requests. Internal/admin SDK calls (e.auth == null) are always allowed through.
onRecordUpdateRequest((e) => {
    try {
        // No auth = internal hook / admin SDK call — skip field guard
        if (!e.auth) return e.next();

        var info = e.requestInfo();
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
