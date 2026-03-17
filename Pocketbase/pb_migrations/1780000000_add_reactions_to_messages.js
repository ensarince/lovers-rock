/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279'); // messages collection
  if (!collection) {
    throw new Error('Messages collection not found');
  }

  // Add reactions field as JSON object
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'reactions',
    name: 'reactions',
    type: 'json',
    required: false,
    presentable: false,
    hidden: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279'); // messages collection
  if (!collection) {
    return;
  }

  // Remove reactions field
  collection.fields.removeById('reactions');

  return app.save(collection);
});
