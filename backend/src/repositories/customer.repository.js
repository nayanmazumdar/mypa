const BaseRepository = require('./BaseRepository');

class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers');
    this.searchFields = ['name', 'phone', 'email'];
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

  async quickSearch(shopId, query) {
    if (!query || query.length < 2) return [];
    return this.raw(
      `SELECT id, name, phone, email, balance FROM customers
       WHERE shop_id = ? AND (name LIKE ? OR phone LIKE ?) AND is_active = 1
       ORDER BY name ASC LIMIT 10`,
      [shopId, `%${query}%`, `%${query}%`]
    );
  }

  async updateBalance(id, shopId, amount) {
    const [result] = await this.pool.query(
      'UPDATE customers SET balance = balance + ? WHERE id = ? AND shop_id = ?',
      [amount, id, shopId]
    );
    return result.affectedRows > 0;
  }

  async resetBalance(id, shopId, amount) {
    const [result] = await this.pool.query(
      'UPDATE customers SET balance = GREATEST(0, balance - ?) WHERE id = ? AND shop_id = ?',
      [amount, id, shopId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new CustomerRepository();
