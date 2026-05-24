/// <reference path="../pb_data/types.d.ts" />

// Auto-set PocketBase APP_URL from Railway's injected env variable.
// Runs on every startup so the URL stays correct if the Railway domain changes.
onServe((e) => {
    const domain = $os.getenv("RAILWAY_PUBLIC_DOMAIN");
    if (!domain) return e.next(); // local dev — leave as-is

    const appUrl = "https://" + domain;
    const settings = $app.settings();

    if (settings.meta.appUrl !== appUrl) {
        settings.meta.appUrl = appUrl;
        try { $app.save(settings); } catch (_) { $app.saveSettings(); }
        console.log("[app_url_config] APP_URL updated to: " + appUrl);
    }

    return e.next();
});
