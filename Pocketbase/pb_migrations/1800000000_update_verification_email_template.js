/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    collection.verificationTemplate.subject = "Verify your Take! email";
    collection.verificationTemplate.actionUrl = "{APP_URL}/api/mobile-verify-email?token={TOKEN}";
    collection.verificationTemplate.body = `<p>Hi,</p>

<p>Thanks for signing up for <strong>Take!</strong> — the climbing community app.</p>

<p>Click the button below to verify your email address:</p>

<p><a href="{APP_URL}/api/mobile-verify-email?token={TOKEN}" style="display:inline-block;background:#FF2E63;color:#ffffff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px;">Verify Email</a></p>

<p style="color:#888;font-size:13px;">If you didn't create a Take! account, you can safely ignore this email.</p>

<p style="color:#888;font-size:13px;">Questions? Contact us at <a href="mailto:takeclimbingapp@gmail.com">takeclimbingapp@gmail.com</a></p>`;

    return app.save(collection);
}, (app) => {
    // no meaningful rollback — leave template as-is
});
