/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // remove field
  collection.fields.removeById("text2555855207")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool2555855207",
    "name": "read",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2555855207",
    "max": 0,
    "min": 0,
    "name": "read",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("bool2555855207")

  return app.save(collection)
})
