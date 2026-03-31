/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_declines",
    "name": "declines",
    "type": "base",
    "system": false,
    "listRule": "from_user = @request.auth.id || to_user = @request.auth.id",
    "viewRule": "from_user = @request.auth.id || to_user = @request.auth.id",
    "createRule": "@request.auth.id = from_user",
    "updateRule": null,
    "deleteRule": "@request.auth.id = from_user",
    "indexes": [],
    "fields": [
      {
        "system": false,
        "id": "from_user",
        "name": "from_user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": 1,
        "maxSelect": 1
      },
      {
        "system": false,
        "id": "to_user",
        "name": "to_user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": 1,
        "maxSelect": 1
      },
      {
        "system": false,
        "id": "intent",
        "name": "intent",
        "type": "select",
        "required": true,
        "presentable": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["dating", "partner"]
      },
      {
        "system": false,
        "id": "declined_at",
        "name": "declined_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "hidden": false
      },
      {
        "hidden": false,
        "id": "created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_declines");

  return app.delete(collection);
});
