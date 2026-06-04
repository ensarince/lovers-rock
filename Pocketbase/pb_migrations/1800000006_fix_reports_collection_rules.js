/// <reference path="../pb_data/types.d.ts" />
// Security fix: the reports collection allowed to_user (the reported person) to
// list and view reports filed against them, revealing the reporter's identity.
// Restrict to from_user (reporter) only. Admins retain full access via superuser.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("reports");
  collection.listRule = "@request.auth.id = from_user";
  collection.viewRule = "@request.auth.id = from_user";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("reports");
  collection.listRule = "@request.auth.id = from_user || @request.auth.id = to_user";
  collection.viewRule = "@request.auth.id = from_user || @request.auth.id = to_user";
  return app.save(collection);
});
