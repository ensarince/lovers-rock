/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // messages — only sender or receiver can list/view; only receiver can update; either can delete
  const messages = app.findCollectionByNameOrId('pbc_2605467279');
  unmarshal({
    listRule:   '@request.auth.id = sender_id || @request.auth.id = receiver_id',
    viewRule:   '@request.auth.id = sender_id || @request.auth.id = receiver_id',
    updateRule: '@request.auth.id = receiver_id',
    deleteRule: '@request.auth.id = sender_id || @request.auth.id = receiver_id',
  }, messages);
  app.save(messages);

  // declines — only the decliner can list/view their own
  const declines = app.findCollectionByNameOrId('pbc_declines');
  unmarshal({
    listRule: '@request.auth.id = from_user',
    viewRule: '@request.auth.id = from_user',
  }, declines);
  app.save(declines);

  // blocks — only blocker or blocked party can list/view
  const blocks = app.findCollectionByNameOrId('pbc_blocks');
  unmarshal({
    listRule: '@request.auth.id = from_user || @request.auth.id = to_user',
    viewRule: '@request.auth.id = from_user || @request.auth.id = to_user',
  }, blocks);
  app.save(blocks);
}, (app) => {
  // rollback: restore previous looser rules
  const messages = app.findCollectionByNameOrId('pbc_2605467279');
  unmarshal({
    listRule:   '@request.auth.id != "" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)',
    viewRule:   '@request.auth.id != "" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)',
    updateRule: '@request.auth.id != "" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)',
    deleteRule: '@request.auth.id != "" && (sender_id = @request.auth.id || receiver_id = @request.auth.id)',
  }, messages);
  app.save(messages);

  const declines = app.findCollectionByNameOrId('pbc_declines');
  unmarshal({
    listRule: 'from_user = @request.auth.id || to_user = @request.auth.id',
    viewRule: 'from_user = @request.auth.id || to_user = @request.auth.id',
  }, declines);
  app.save(declines);

  const blocks = app.findCollectionByNameOrId('pbc_blocks');
  unmarshal({
    listRule: 'from_user = @request.auth.id || to_user = @request.auth.id',
    viewRule: 'from_user = @request.auth.id || to_user = @request.auth.id',
  }, blocks);
  app.save(blocks);
});
