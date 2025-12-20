/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "select2766388982",
    "maxSelect": 5,
    "name": "climbing_styles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "bouldering",
      "sport",
      "trad",
      "gym",
      "outdoor"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "select2766388982",
    "maxSelect": 1,
    "name": "climbing_styles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "bouldering",
      "sport",
      "trad",
      "gym",
      "outdoor"
    ]
  }))

  return app.save(collection)
})
