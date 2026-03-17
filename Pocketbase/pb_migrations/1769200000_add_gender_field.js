/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Add gender select field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'gender',
    name: 'gender',
    type: 'select',
    required: false,
    presentable: false,
    hidden: false,
    maxSelect: 1,
    values: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    return;
  }

  // Remove gender field
  collection.fields.removeById('gender');

  return app.save(collection);
});
