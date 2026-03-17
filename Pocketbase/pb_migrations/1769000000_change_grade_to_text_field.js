/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Remove the old select grade field
  collection.fields.removeById("select1499115060")

  // Add new text field for grade JSON
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "text1769000000",
    "max": 0,
    "min": 0,
    "name": "grade",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Reverse migration: convert back to select
  collection.fields.removeById("text1769000000")

  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "select1499115060",
    "maxSelect": 1,
    "name": "grade",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "beginner",
      "intermediate",
      "advanced",
      "expert",
      "elite"
    ]
  }))

  return app.save(collection)
})
