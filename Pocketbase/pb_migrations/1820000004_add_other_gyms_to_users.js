/// <reference path="../pb_data/types.d.ts" />

// "I climb here too": gyms someone climbs at besides their home gym.
// See handoff/MAP-PLAN.md, Phase 4.
//
//   other_gyms  json, the names the user typed (up to 3). Written by the app.
//   extra_gyms  relation, the gym records those names resolve to. Set by the
//               server (pb_hooks/gyms.pb.js), never by the app.
//
// Same split as home_gym / gym, so old builds that know nothing about either
// keep working.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  collection.fields.add(new Field({
    "hidden": false,
    "id": "json_users_other_gyms",
    "maxSize": 2000,
    "name": "other_gyms",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "relation_users_extra_gyms",
    "name": "extra_gyms",
    "type": "relation",
    "required": false,
    "presentable": false,
    "system": false,
    "collectionId": "pbc_gyms",
    "cascadeDelete": false,
    "minSelect": 0,
    "maxSelect": 3
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  collection.fields.removeById("json_users_other_gyms");
  collection.fields.removeById("relation_users_extra_gyms");
  return app.save(collection);
});
