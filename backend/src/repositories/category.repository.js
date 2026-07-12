const BaseRepository = require('./BaseRepository');

class CategoryRepository extends BaseRepository {
  constructor() {
    super('categories');
  }

  async findAllByShop(shopId) {
    return this.findAll(shopId, { orderBy: 'name ASC', limit: 500 });
  }
}

module.exports = new CategoryRepository();
