/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  collection.fields.add(new Field({
    "system": false,
    "id": "interested_in",
    "name": "interested_in",
    "type": "text",
    "required": false,
    "presentable": false,
    "hidden": false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeById("interested_in");
  return app.save(collection);
});
