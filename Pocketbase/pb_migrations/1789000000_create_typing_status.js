/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id = sender_id",
    "deleteRule": "@request.auth.id = sender_id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_typing_id",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "relation_sender",
        "name": "sender_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "system": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": 1,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "id": "relation_receiver",
        "name": "receiver_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "system": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": 1,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "id": "bool_typing",
        "name": "is_typing",
        "type": "bool",
        "required": true,
        "presentable": false,
        "system": false
      },
      {
        "hidden": false,
        "id": "date_expires",
        "name": "expires_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "system": false
      }
    ],
    "id": "pbc_typing_status",
    "indexes": [],
    "listRule": "sender_id = @request.auth.id || receiver_id = @request.auth.id",
    "name": "typing_status",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = sender_id",
    "viewRule": "sender_id = @request.auth.id || receiver_id = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_typing_status");

  return app.delete(collection);
});
