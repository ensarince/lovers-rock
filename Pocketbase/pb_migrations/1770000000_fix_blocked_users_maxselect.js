/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Remove the old blocked_users field
  collection.fields.removeById('blocked_users');

  // Add new blocked_users as TEXT field to store JSON array of IDs
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'blocked_users',
    name: 'blocked_users',
    type: 'text',
    required: false,
    presentable: false,
    hidden: false,
  }));

  return app.save(collection);
}, (app) => {
  // Rollback - restore as relation field
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    return app;
  }

  collection.fields.removeById('blocked_users');
  
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
});

