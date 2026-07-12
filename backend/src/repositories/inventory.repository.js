const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory');
  }

  async findAllWithProducts(shopId, { page = 1, limit = 20, search } = {}) {
    const offset = (page - 1) * limit;
    let query = `SELECT i.*, p.name as product_name, p.sku, p.barcode
                 FROM inventory i
                 JOIN products p ON i.product_id = p.id
                 WHERE i.shop_id = ?`;
    let countQuery = 'SELECT COUNT(*) as total FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.shop_id = ?';
    const params = [shopId];
    const countParams = [shopId];

    if (search) {
      const searchClause = ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      const term = `%${search}%`;
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.pool.query(query, params);
    const [countResult] = await this.pool.query(countQuery, countParams);
    const total = countResult[0].total;

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findLowStock(shopId) {
    return this.raw(
      `SELECT i.*, p.name as product_name, p.sku
       FROM inventory i JOIN products p ON i.product_id = p.id
       WHERE i.shop_id = ? AND i.quantity <= i.min_stock_level
       ORDER BY i.quantity ASC`,
      [shopId]
    );
  }

  async adjustStock(shopId, productId, quantity, type) {
    const op = type === 'out' ? '-' : '+';
    const [result] = await this.pool.query(
      `UPDATE inventory SET quantity = quantity ${op} ? WHERE product_id = ? AND shop_id = ?`,
      [quantity, productId, shopId]
    );

    // If no row exists, create it (stock in)
    if (result.affectedRows === 0 && type === 'in') {
      await this.pool.query(
        'INSERT INTO inventory (product_id, user_id, shop_id, quantity) VALUES (?, ?, ?, ?)',
        [productId, shopId, shopId, quantity]
      );
    }
    return true;
  }

  async logMovement(shopId, { productId, userId, type, quantity, referenceType, referenceId, notes }) {
    await this.pool.query(
      'INSERT INTO stock_movements (product_id, user_id, shop_id, type, quantity, reference_type, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, userId, shopId, type, quantity, referenceType || null, referenceId || null, notes || null]
    );
  }
}

module.exports = new InventoryRepository();
