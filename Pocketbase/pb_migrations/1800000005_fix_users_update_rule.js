/// <reference path="../pb_data/types.d.ts" />
// Security fix: the users auth collection had no explicit updateRule, meaning
// the default could allow any authenticated user to PATCH another user's record
// (push_token, verified, blocked_users, etc.). Lock it to owner-only.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.updateRule = "id = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.updateRule = null;
  return app.save(collection);
});
