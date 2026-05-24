/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    collection.resetPasswordTemplate.subject = "Reset your Take! password";
    collection.resetPasswordTemplate.actionUrl = "{APP_URL}/api/mobile-reset-password?token={TOKEN}";
    collection.resetPasswordTemplate.body = `<p>Hi,</p>

<p>We received a request to reset your <strong>Take!</strong> password.</p>

<p>Click the button below to set a new password:</p>

<p><a href="{APP_URL}/api/mobile-reset-password?token={TOKEN}" style="display:inline-block;background:#FF2E63;color:#ffffff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px;">Reset Password</a></p>

<p style="color:#888;font-size:13px;">This link expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>

<p style="color:#888;font-size:13px;">Questions? Contact us at <a href="mailto:takeclimbingapp@gmail.com">takeclimbingapp@gmail.com</a></p>`;

    return app.save(collection);
}, (app) => {
    // no meaningful rollback
});
