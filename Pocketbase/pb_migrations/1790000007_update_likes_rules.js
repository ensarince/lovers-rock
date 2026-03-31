/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_likes");
  collection.deleteRule = "from_user = @request.auth.id || to_user = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_likes");
  collection.deleteRule = "@request.auth.id = from_user";
  return app.save(collection);
});
