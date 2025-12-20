/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("text3912345333")

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3982664153",
    "max": 0,
    "min": 0,
    "name": "home_gym",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
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

  // add field
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

  // add field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "number2704281778",
    "max": null,
    "min": null,
    "name": "age",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3912345333",
    "max": 0,
    "min": 0,
    "name": "preferences",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("text3982664153")

  // remove field
  collection.fields.removeById("select2766388982")

  // remove field
  collection.fields.removeById("select1499115060")

  // remove field
  collection.fields.removeById("number2704281778")

  return app.save(collection)
})
