/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "select3194813201",
    "maxSelect": 2,
    "name": "intent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "dating",
      "partnering"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("select3194813201")

  return app.save(collection)
})
