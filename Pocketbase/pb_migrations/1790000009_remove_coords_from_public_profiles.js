/// <reference path="../pb_data/types.d.ts" />

// Remove lat/lng/last_location_update from the public_profiles view.
// Raw coordinates must not be queryable by arbitrary authenticated users.
// Distance calculation now happens server-side in the /api/nearby-profiles hook.

const safePublicProfileFields = () => {
  return new FieldsList([
    new Field({ "system": false, "id": "name", "name": "name", "type": "text", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "age", "name": "age", "type": "number", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "gender", "name": "gender", "type": "text", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "grade", "name": "grade", "type": "json", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "climbing_styles", "name": "climbing_styles", "type": "json", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "home_gym", "name": "home_gym", "type": "text", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "bio", "name": "bio", "type": "text", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "verified", "name": "verified", "type": "bool", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "images", "name": "images", "type": "json", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "avatar", "name": "avatar", "type": "text", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "intent", "name": "intent", "type": "json", "required": false, "presentable": false, "hidden": false }),
    new Field({ "system": false, "id": "profile_completed", "name": "profile_completed", "type": "bool", "required": false, "presentable": false, "hidden": false }),
  ]);
};

migrate((app) => {
  var collection = app.findCollectionByNameOrId("pbc_public_profiles");
  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, profile_completed FROM users";
  collection.fields = safePublicProfileFields();
  return app.save(collection);
}, (app) => {
  // Rollback: restore lat/lng fields
  var collection = app.findCollectionByNameOrId("pbc_public_profiles");
  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, latitude, longitude, last_location_update, profile_completed FROM users";
  return app.save(collection);
});
