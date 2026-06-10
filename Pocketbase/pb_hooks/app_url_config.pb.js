/// <reference path="../pb_data/types.d.ts" />

// Auto-set PocketBase APP_URL from Railway's injected env variable.
// Runs on every startup so the URL stays correct if the Railway domain changes.
onBootstrap((e) => {
    try {
        const domain = $os.getenv("RAILWAY_PUBLIC_DOMAIN");
        if (!domain) return e.next(); // local dev — leave as-is

        const appUrl = "https://" + domain;
        const settings = $app.settings();

        // appURL is the correct field name in PB v0.23+ (types.d.ts: MetaConfig.appURL)
        if (settings.meta.appURL !== appUrl) {
            settings.meta.appURL = appUrl;
            try { $app.save(settings); } catch (_) { /* best-effort */ }
            console.log("[app_url_config] APP_URL updated to: " + appUrl);
        }
    } catch (err) {
        // Never crash PocketBase over a non-critical config hook
        console.error("[app_url_config] failed (non-fatal):", String(err));
    }
    return e.next();
});
