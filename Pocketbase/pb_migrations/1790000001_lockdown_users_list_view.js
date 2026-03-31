/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  // Restrict list/view to the authenticated user only
  unmarshal({
    "listRule": "id = @request.auth.id",
    "viewRule": "id = @request.auth.id"
  }, collection);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  // Roll back to allow any authenticated user (previous behavior)
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection);

  return app.save(collection);
});
