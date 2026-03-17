/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: "@request.auth.id != \"\"",
    deleteRule: "@request.auth.id = from_user",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text3208210256",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text"
      },
      {
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "relation_from_user",
        name: "from_user",
        type: "relation",
        required: true,
        presentable: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        hidden: false,
        id: "relation_to_user",
        name: "to_user",
        type: "relation",
        required: true,
        presentable: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        hidden: false,
        id: "select_reason",
        name: "reason",
        type: "select",
        required: true,
        presentable: false,
        values: ['harassment', 'inappropriate_photos', 'spam', 'fake_profile', 'other'],
        maxSelect: 1,
      },
      {
        hidden: false,
        id: "text_description",
        name: "description",
        type: "text",
        required: false,
        presentable: false,
      },
      {
        hidden: false,
        id: "select_status",
        name: "status",
        type: "select",
        required: false,
        presentable: false,
        values: ['pending', 'reviewed', 'resolved'],
        maxSelect: 1,
      },
    ],
    id: "pbc_reports",
    indexes: [],
    listRule: "@request.auth.id = from_user || @request.auth.id = to_user",
    name: "reports",
    system: false,
    type: "base",
    updateRule: null,
    viewRule: "@request.auth.id = from_user || @request.auth.id = to_user"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('reports');
  if (collection) {
    return app.delete(collection);
  }
});
