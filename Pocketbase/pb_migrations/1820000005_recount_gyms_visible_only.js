/// <reference path="../pb_data/types.d.ts" />

// Climber counts now include only finished, verified profiles (the people the
// gym page can actually show), plus extra gyms. Recount every gym once so the
// existing numbers follow the new rule. See gyms_lib.js CLIMBS_AT_SQL.

migrate((app) => {
  app.db().newQuery(
    "UPDATE gyms SET climber_count = (SELECT COUNT(*) FROM users WHERE " +
    "users.profile_completed = TRUE AND users.verified = TRUE AND " +
    "(users.gym = gyms.id OR EXISTS (SELECT 1 FROM json_each(" +
    "CASE WHEN json_valid(users.extra_gyms) THEN users.extra_gyms ELSE '[]' END" +
    ") WHERE json_each.value = gyms.id)))"
  ).execute();
}, () => {
  // Nothing to undo: counts are derived data.
});
