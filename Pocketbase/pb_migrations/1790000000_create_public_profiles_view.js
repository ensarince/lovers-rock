/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_public_profiles",
    "name": "public_profiles",
    "type": "view",
    "system": false,
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "indexes": [],
    "viewQuery": "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, latitude, longitude, last_location_update, profile_completed, blocked_users, liked_users_dating, liked_users_partner, declined_users_as_dating, declined_users_as_partner FROM users",
    "fields": [
      {
        "system": false,
        "id": "name",
        "name": "name",
        "type": "text",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "age",
        "name": "age",
        "type": "number",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "gender",
        "name": "gender",
        "type": "text",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "grade",
        "name": "grade",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "climbing_styles",
        "name": "climbing_styles",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "home_gym",
        "name": "home_gym",
        "type": "text",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "bio",
        "name": "bio",
        "type": "text",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "verified",
        "name": "verified",
        "type": "bool",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "images",
        "name": "images",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "avatar",
        "name": "avatar",
        "type": "text",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "intent",
        "name": "intent",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "latitude",
        "name": "latitude",
        "type": "number",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "longitude",
        "name": "longitude",
        "type": "number",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "last_location_update",
        "name": "last_location_update",
        "type": "date",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "profile_completed",
        "name": "profile_completed",
        "type": "bool",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "blocked_users",
        "name": "blocked_users",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "liked_users_dating",
        "name": "liked_users_dating",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "liked_users_partner",
        "name": "liked_users_partner",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "declined_users_as_dating",
        "name": "declined_users_as_dating",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "system": false,
        "id": "declined_users_as_partner",
        "name": "declined_users_as_partner",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_public_profiles");

  return app.delete(collection);
});
