/// <reference path="../pb_data/types.d.ts" />

// Lets encrypted photos through the image_attachment upload.
//
// PocketBase sniffs the file content to decide its MIME type. An encrypted photo
// is indistinguishable from random bytes, so it sniffs as application/octet-stream
// and the old image-only list rejected it.
//
// The plain image types stay allowed for the rollout: clients on the previous
// build keep uploading real JPEGs, and their messages must not start failing.
//
// This does loosen what can be uploaded here. The 2MB cap still applies, the
// create rule still requires a match, and the media rate limit still caps it at
// 20 per hour. Content validation was never going to survive encryption anyway:
// bytes only this device can read are bytes the server cannot inspect.

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/octet-stream',
];

migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279'); // messages
  if (!collection) {
    throw new Error('Messages collection not found');
  }

  const field = collection.fields.getById('image_attachment');
  if (!field) {
    throw new Error('image_attachment field not found');
  }

  field.mimeTypes = ALLOWED_MIME_TYPES;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279');
  if (!collection) return;

  const field = collection.fields.getById('image_attachment');
  if (!field) return;

  field.mimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  return app.save(collection);
});
