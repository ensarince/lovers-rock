/// <reference path="../pb_data/types.d.ts" />
// Security fix: messages updateRule was too broad — receivers could overwrite
// content, sender_id, and receiver_id. Now only the sender can update
// reactions and only the receiver can mark read. Field-level enforcement
// is handled by the message_field_guard.pb.js hook.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("messages");
  collection.updateRule = "@request.auth.id = receiver_id || @request.auth.id = sender_id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("messages");
  collection.updateRule = "@request.auth.id = receiver_id";
  return app.save(collection);
});
