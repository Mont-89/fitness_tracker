class InMemoryRepository {
  constructor() {
    this.items = [];
  }

  create(item) {
    this.items.push(item);
    return item;
  }

  findAll(filterFn = null) {
    return filterFn ? this.items.filter(filterFn) : [...this.items];
  }

  findById(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  update(id, updater) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = { ...this.items[index], ...updater };
    this.items[index] = updated;
    return updated;
  }
}

module.exports = { InMemoryRepository };
