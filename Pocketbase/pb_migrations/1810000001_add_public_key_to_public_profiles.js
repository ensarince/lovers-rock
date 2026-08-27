/// <reference path="../pb_data/types.d.ts" />

// Exposes public_key through the public_profiles view.
//
// The chat screen already fetches the peer from public_profiles, so the key it
// needs to derive the conversation key rides along in a request that happens
// anyway. Safe to expose: a public key reveals nothing without the matching
// secret key, which never leaves the owner device.
//
// Mirrors 1790000009_remove_coords_from_public_profiles.js — the view has an
// explicit field list, so the query and the list must be updated together.

const publicProfileFields = () => {
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
    new Field({ "system": false, "id": "public_key", "name": "public_key", "type": "text", "required": false, "presentable": false, "hidden": false }),
  ]);
};

migrate((app) => {
  var collection = app.findCollectionByNameOrId("pbc_public_profiles");
  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, profile_completed, public_key FROM users";
  collection.fields = publicProfileFields();
  return app.save(collection);
}, (app) => {
  // Rollback: drop public_key, leaving the view as 1790000009 left it.
  var collection = app.findCollectionByNameOrId("pbc_public_profiles");
  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, profile_completed FROM users";
  var fields = publicProfileFields();
  fields.removeById("public_key");
  collection.fields = fields;
  return app.save(collection);
});
