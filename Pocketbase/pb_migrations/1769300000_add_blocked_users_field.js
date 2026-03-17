/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Add blocked_users relation field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'blocked_users',
    name: 'blocked_users',
    type: 'relation',
    required: false,
    presentable: false,
    hidden: false,
    collectionId: '_pb_users_auth_',
    cascadeDelete: false,
    minSelect: null,
    maxSelect: null,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    return;
  }

  // Remove blocked_users field
  collection.fields.removeById('blocked_users');

  return app.save(collection);
});
