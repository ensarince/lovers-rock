/// <reference path="../pb_data/types.d.ts" />

const publicProfileFields = (includeSocialGraph) => {
  const fields = [
    new Field({
      "system": false,
      "id": "name",
      "name": "name",
      "type": "text",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "age",
      "name": "age",
      "type": "number",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "gender",
      "name": "gender",
      "type": "text",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "grade",
      "name": "grade",
      "type": "json",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "climbing_styles",
      "name": "climbing_styles",
      "type": "json",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "home_gym",
      "name": "home_gym",
      "type": "text",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "bio",
      "name": "bio",
      "type": "text",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "verified",
      "name": "verified",
      "type": "bool",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "images",
      "name": "images",
      "type": "json",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "avatar",
      "name": "avatar",
      "type": "text",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "intent",
      "name": "intent",
      "type": "json",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "latitude",
      "name": "latitude",
      "type": "number",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "longitude",
      "name": "longitude",
      "type": "number",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "last_location_update",
      "name": "last_location_update",
      "type": "date",
      "required": false,
      "presentable": false,
      "hidden": false
    }),
    new Field({
      "system": false,
      "id": "profile_completed",
      "name": "profile_completed",
      "type": "bool",
      "required": false,
      "presentable": false,
      "hidden": false
    })
  ];

  if (includeSocialGraph) {
    fields.push(
      new Field({
        "system": false,
        "id": "blocked_users",
        "name": "blocked_users",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      }),
      new Field({
        "system": false,
        "id": "liked_users_dating",
        "name": "liked_users_dating",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      }),
      new Field({
        "system": false,
        "id": "liked_users_partner",
        "name": "liked_users_partner",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      }),
      new Field({
        "system": false,
        "id": "declined_users_as_dating",
        "name": "declined_users_as_dating",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      }),
      new Field({
        "system": false,
        "id": "declined_users_as_partner",
        "name": "declined_users_as_partner",
        "type": "json",
        "required": false,
        "presentable": false,
        "hidden": false
      })
    );
  }

  return new FieldsList(fields);
};

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_public_profiles");

  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, latitude, longitude, last_location_update, profile_completed FROM users";
  collection.fields = publicProfileFields(false);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_public_profiles");

  collection.viewQuery = "SELECT id, name, age, gender, grade, climbing_styles, home_gym, bio, verified, images, avatar, intent, latitude, longitude, last_location_update, profile_completed, blocked_users, liked_users_dating, liked_users_partner, declined_users_as_dating, declined_users_as_partner FROM users";
  collection.fields = publicProfileFields(true);

  return app.save(collection);
});
