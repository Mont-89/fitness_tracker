const { InMemoryRepository } = require('./inMemoryRepository');

const repositories = {
  users: new InMemoryRepository(),
  notifications: new InMemoryRepository(),
  sessions: new InMemoryRepository(),
  magicLinks: new InMemoryRepository()
};

module.exports = { repositories };
