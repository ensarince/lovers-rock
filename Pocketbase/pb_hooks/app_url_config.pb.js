/// <reference path="../pb_data/types.d.ts" />

// Logs the Railway domain on startup so you know what APP_URL to set in the
// PocketBase admin dashboard (/_/ → Settings → Application URL).
//
// NOTE: $app.save(settings) triggers a nil pointer panic in PB v0.23+ because
// Settings is not a Record and bypasses JS try/catch. Auto-saving is disabled.
// Set APP_URL manually once via the admin UI — it persists in pb_data.
onBootstrap((e) => {
    try {
        const domain = $os.getenv("RAILWAY_PUBLIC_DOMAIN");
        if (domain) {
            console.log("[app_url_config] Railway domain detected: https://" + domain);
        }
    } catch (err) {
        console.error("[app_url_config] error:", String(err));
    }
    return e.next();
});
