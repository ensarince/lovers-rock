/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Add profile_completed boolean field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'profile_completed',
    name: 'profile_completed',
    type: 'bool',
    required: false,
    presentable: false,
    hidden: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    return;
  }

  // Remove profile_completed field
  collection.fields.removeById('profile_completed');

  return app.save(collection);
});
