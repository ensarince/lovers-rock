/// <reference path="../pb_data/types.d.ts" />

// Links each user to a gym record. Set by the server from the free-text
// home_gym (pb_hooks/gyms.pb.js); clients never write it.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  collection.fields.add(new Field({
    "hidden": false,
    "id": "relation_users_gym",
    "name": "gym",
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
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  collection.fields.removeById("relation_users_gym");
  return app.save(collection);
});
