/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('reports');
  if (!collection) {
    throw new Error('Reports collection not found');
  }

  // Update permissions to allow authenticated users to create reports
  collection.createRule = '@request.auth.id != ""';
  collection.deleteRule = '@request.auth.id = from_user';
  collection.listRule = '@request.auth.id = from_user || @request.auth.id = to_user';
  collection.viewRule = '@request.auth.id = from_user || @request.auth.id = to_user';

  return app.save(collection);
}, (app) => {
  // Rollback - restore original permissions (superusers only)
  const collection = app.findCollectionByNameOrId('reports');
  if (!collection) {
    return app;
  }

  collection.createRule = null;
  collection.deleteRule = null;
  collection.listRule = null;
  collection.viewRule = null;

  return app.save(collection);
});
