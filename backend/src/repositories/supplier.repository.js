const BaseRepository = require('./BaseRepository');

class SupplierRepository extends BaseRepository {
  constructor() {
    super('suppliers');
    this.searchFields = ['name', 'company', 'phone'];
  }

  async findAllPaginated(shopId, { page, limit, search }) {
    return this.paginate(shopId, {
      page,
      limit,
      search,
      searchFields: this.searchFields,
      orderBy: 'name ASC',
    });
  }
}

module.exports = new SupplierRepository();
