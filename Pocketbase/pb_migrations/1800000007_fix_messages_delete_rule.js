/// <reference path="../pb_data/types.d.ts" />
// Security fix: messages deleteRule allowed the receiver to delete messages,
// meaning an attacker could send harassing messages then delete them before
// the victim could screenshot and report. Restrict deletion to sender only.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("messages");
  collection.deleteRule = "@request.auth.id = sender_id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("messages");
  collection.deleteRule = "@request.auth.id != \"\" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)";
  return app.save(collection);
});
