const BaseRepository = require('./BaseRepository');

class OfferRepository extends BaseRepository {
  constructor() {
    super('offers');
  }

  async findAllPaginated(shopId, { page, limit, active_only }) {
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split('T')[0];

    let query = `SELECT o.*, c.name as category_name, p.name as product_name
                 FROM offers o
                 LEFT JOIN categories c ON o.category_id = c.id
                 LEFT JOIN products p ON o.product_id = p.id
                 WHERE o.shop_id = ?`;
    let countQuery = 'SELECT COUNT(*) as total FROM offers WHERE shop_id = ?';
    const params = [shopId];
    const countParams = [shopId];

    if (active_only) {
      const activeClause = ' AND o.is_active = 1 AND o.start_date <= ? AND o.end_date >= ?';
      query += activeClause;
      countQuery += ' AND is_active = 1 AND start_date <= ? AND end_date >= ?';
      params.push(today, today);
      countParams.push(today, today);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.pool.query(query, params);
    const [countResult] = await this.pool.query(countQuery, countParams);

    return {
      data: rows,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) },
    };
  }

  async findActive(shopId) {
    const today = new Date().toISOString().split('T')[0];
    return this.raw(
      `SELECT o.*, c.name as category_name, p.name as product_name
       FROM offers o
       LEFT JOIN categories c ON o.category_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.shop_id = ? AND o.is_active = 1 AND o.start_date <= ? AND o.end_date >= ?
       ORDER BY o.discount_value DESC`,
      [shopId, today, today]
    );
  }

  async findForProduct(shopId, productId, categoryId) {
    const today = new Date().toISOString().split('T')[0];
    return this.raw(
      `SELECT * FROM offers WHERE shop_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?
       AND (applicable_to = 'all' OR (applicable_to = 'product' AND product_id = ?) OR (applicable_to = 'category' AND category_id = ?))
       ORDER BY discount_value DESC LIMIT 1`,
      [shopId, today, today, productId, categoryId || 0]
    );
  }
}

module.exports = new OfferRepository();
