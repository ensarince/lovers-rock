class PocketBase {
  constructor() {
    this.authStore = {
      token: '',
      save: jest.fn(),
    };
  }
  collection() {
    return {
      subscribe: jest.fn().mockResolvedValue(() => Promise.resolve()),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      getFirstListItem: jest.fn(),
      getFullList: jest.fn().mockResolvedValue([]),
      getList: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      getOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  }
}

module.exports = PocketBase;
module.exports.default = PocketBase;
