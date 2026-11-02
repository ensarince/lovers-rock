/// <reference path="../pb_data/types.d.ts" />

// Gives every gym that never got a location one more try, now that the
// geocode cron has a fuzzy fallback for typos and missing accents
// ("akalla klattecentret" -> Klättercentret). See gyms_lib.js geocodeFuzzy.

migrate((app) => {
  app.db()
    .newQuery("UPDATE gyms SET geocode_tried = FALSE WHERE latitude = 0 AND longitude = 0")
    .execute();
}, () => {
  // Nothing to undo: the cron just marks them tried again.
});
