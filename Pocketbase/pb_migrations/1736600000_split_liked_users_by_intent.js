/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Add liked_users_dating field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "json_dating_001",
    "maxSize": 0,
    "name": "liked_users_dating",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // Add liked_users_partner field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "json_partner_001",
    "maxSize": 0,
    "name": "liked_users_partner",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Remove the new fields on rollback
  collection.fields.removeById("json_dating_001")
  collection.fields.removeById("json_partner_001")

  return app.save(collection)
})
