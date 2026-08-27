/// <reference path="../pb_data/types.d.ts" />

// Adds the X25519 public key used for end-to-end encrypted messages.
//
// Public by design: it is half of a key pair whose secret half never leaves the
// user device. Publishing it is what lets a match derive the shared conversation
// key. An empty value means that user has not opened an encryption-capable build
// yet, and clients fall back to sending them plaintext.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "text_public_key",
    "max": 0,
    "min": 0,
    "name": "public_key",
    "pattern": "",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")
  collection.fields.removeById("text_public_key")
  return app.save(collection)
})
