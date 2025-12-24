/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && sender_id = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && sender_id = @request.auth.id",
    "updateRule": "@request.auth.id != \"\" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)",
    "viewRule": "@request.auth.id != \"\" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
