/// <reference path="../pb_data/types.d.ts" />
// Security fix: only the liker (from_user) may delete a like.
// The previous migration opened deletion to to_user as well, which
// allowed any authenticated user to silently erase incoming likes and
// prevent matches from forming.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_likes");
  collection.deleteRule = "@request.auth.id = from_user";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_likes");
  collection.deleteRule = "from_user = @request.auth.id || to_user = @request.auth.id";
  return app.save(collection);
});
