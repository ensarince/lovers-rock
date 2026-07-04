/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279'); // messages collection
  if (!collection) {
    throw new Error('Messages collection not found');
  }

  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'reply_to_id',
    name: 'reply_to_id',
    type: 'text',
    required: false,
    presentable: false,
    hidden: false,
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'reply_to_preview',
    name: 'reply_to_preview',
    type: 'text',
    required: false,
    presentable: false,
    hidden: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279');
  if (!collection) return;

  collection.fields.removeById('reply_to_id');
  collection.fields.removeById('reply_to_preview');

  return app.save(collection);
});
