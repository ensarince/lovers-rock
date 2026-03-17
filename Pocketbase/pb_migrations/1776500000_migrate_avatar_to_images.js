/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Add images field (file field that accepts multiple files)
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'images',
    name: 'images',
    type: 'file',
    required: false,
    presentable: false,
    hidden: false,
    maxSelect: 3, // Maximum 3 images
    maxSize: 5242880, // 5MB per file
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    return;
  }

  // Remove the images field on rollback
  collection.fields.removeById('images');
  return app.save(collection);
});
