/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279'); // messages collection
  if (!collection) {
    throw new Error('Messages collection not found');
  }

  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'message_type',
    name: 'message_type',
    type: 'text',
    required: false,
    presentable: false,
    hidden: false,
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'image_attachment',
    name: 'image_attachment',
    type: 'file',
    required: false,
    presentable: false,
    hidden: false,
    maxSelect: 1,
    maxSize: 2097152, // 2MB hard cap per file
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'attachment_url',
    name: 'attachment_url',
    type: 'text',
    required: false,
    presentable: false,
    hidden: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279');
  if (!collection) return;

  collection.fields.removeById('message_type');
  collection.fields.removeById('image_attachment');
  collection.fields.removeById('attachment_url');

  return app.save(collection);
});
