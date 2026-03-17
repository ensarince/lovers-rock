/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('users');
  if (!collection) {
    throw new Error('Users collection not found');
  }

  // Add latitude field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'latitude',
    name: 'latitude',
    type: 'number',
    required: false,
    presentable: false,
    hidden: false,
    min: -90,
    max: 90,
  }));

  // Add longitude field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'longitude',
    name: 'longitude',
    type: 'number',
    required: false,
    presentable: false,
    hidden: false,
    min: -180,
    max: 180,
  }));

  // Add last_location_update field
  collection.fields.addAt(collection.fields.length, new Field({
    system: false,
    id: 'last_location_update',
    name: 'last_location_update',
    type: 'date',
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

  // Remove fields
  collection.fields.removeById('latitude');
  collection.fields.removeById('longitude');
  collection.fields.removeById('last_location_update');

  return app.save(collection);
});
