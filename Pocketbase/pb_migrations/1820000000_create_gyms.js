/// <reference path="../pb_data/types.d.ts" />

// Gyms as real records, so a map can pin them and duplicates can be merged.
// See handoff/MAP-PLAN.md, Phase 1.
//
// Read-only over the API. Gyms are created by the server when someone saves a
// home gym nobody entered yet (that is how "anyone can add" works), and edited
// by admins. No client can write here directly, which keeps junk pins out.
//
// Only public places live here. Nothing about where a person is.

migrate((app) => {
  const collection = new Collection({
    "id": "pbc_gyms",
    "name": "gyms",
    "type": "base",
    "system": false,
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_gyms_id",
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
        "id": "text_gyms_name",
        "max": 120,
        "min": 1,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // Lowercased, whitespace-collapsed name. The lookup key, unique.
        "hidden": false,
        "id": "text_gyms_name_key",
        "max": 120,
        "min": 1,
        "name": "name_key",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // Other spellings that resolve to this gym, filled in by merges.
        "hidden": false,
        "id": "json_gyms_aliases",
        "maxSize": 0,
        "name": "aliases",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "number_gyms_latitude",
        "max": null,
        "min": null,
        "name": "latitude",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_gyms_longitude",
        "max": null,
        "min": null,
        "name": "longitude",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_gyms_climber_count",
        "max": null,
        "min": 0,
        "name": "climber_count",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "bool_gyms_geocode_tried",
        "name": "geocode_tried",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        // Admin flag for "this is a real gym, checked by hand".
        "hidden": false,
        "id": "bool_gyms_verified",
        "name": "verified",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        // Hidden from the API: who added a gym is nobody else's business. The
        // server uses it only to bias the geocoding search to the right city.
        "hidden": true,
        "id": "relation_gyms_created_by",
        "name": "created_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "system": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "minSelect": 0,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "id": "autodate_gyms_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_gyms_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gyms_name_key` ON `gyms` (`name_key`)"
    ]
  });

  app.save(collection);

  // Self-relation, so it can only be added once the collection exists.
  // Set it in the admin UI on a duplicate to merge it into the real gym.
  collection.fields.add(new Field({
    "hidden": false,
    "id": "relation_gyms_merge_into",
    "name": "merge_into",
    "type": "relation",
    "required": false,
    "presentable": false,
    "system": false,
    "collectionId": "pbc_gyms",
    "cascadeDelete": false,
    "minSelect": 0,
    "maxSelect": 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_gyms");
  return app.delete(collection);
});
