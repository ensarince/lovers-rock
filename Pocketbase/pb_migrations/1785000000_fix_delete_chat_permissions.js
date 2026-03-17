/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279') // messages collection

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)",
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279') // messages collection

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && sender_id = @request.auth.id",
  }, collection)

  return app.save(collection)
})
