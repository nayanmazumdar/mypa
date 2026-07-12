const { getPool } = require('../config/db');
const logger = require('../config/logger');

class InventoryService {
  async getStock(shopId, productId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    return rows[0] || null;
  }

  async getAllStock(shopId, { limit, offset }) {
    const pool = getPool();
    // LEFT JOIN so products with no inventory row still appear (quantity defaults to 0)
    const [rows] = await pool.query(
      `SELECT
         COALESCE(i.id, 0)                       AS id,
         p.id                                     AS product_id,
         p.name                                   AS product_name,
         p.sku,
         p.unit,
         COALESCE(i.quantity, 0)                  AS quantity,
         COALESCE(i.min_stock_level, 0)           AS min_stock_level,
         COALESCE(i.max_stock_level, 0)           AS max_stock_level,
         i.location
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.shop_id = ?
       WHERE p.shop_id = ? AND p.is_active = 1
       ORDER BY p.name ASC
       LIMIT ? OFFSET ?`,
      [shopId, shopId, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM products WHERE shop_id = ? AND is_active = 1',
      [shopId]
    );
    return { items: rows, total };
  }

  async getLowStock(shopId) {
    const pool = getPool();
    // LEFT JOIN so 0-quantity products with a min_stock_level set also appear
    const [rows] = await pool.query(
      `SELECT
         p.id                                     AS product_id,
         p.name                                   AS product_name,
         p.sku,
         COALESCE(i.quantity, 0)                  AS quantity,
         COALESCE(i.min_stock_level, 0)           AS min_stock_level
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.shop_id = ?
       WHERE p.shop_id = ? AND p.is_active = 1
         AND COALESCE(i.quantity, 0) <= COALESCE(i.min_stock_level, 0)
         AND COALESCE(i.min_stock_level, 0) > 0`,
      [shopId, shopId]
    );
    return rows;
  }

  /**
   * Add, remove, or set stock for a product.
   * type: 'in' → add, 'out' → subtract, 'adjustment' → set absolute value.
   */
  async addStock(shopId, productId, quantity, type, referenceType, referenceId, notes) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Resolve user_id — needed for NOT NULL FK on inventory and stock_movements
      const [[product]] = await connection.query(
        'SELECT user_id FROM products WHERE id = ? AND shop_id = ?',
        [productId, shopId]
      );
      if (!product) {
        const err = new Error('Product not found in this shop');
        err.statusCode = 404;
        throw err;
      }
      const userId = product.user_id;

      // Upsert inventory row
      const [existing] = await connection.query(
        'SELECT * FROM inventory WHERE shop_id = ? AND product_id = ?',
        [shopId, productId]
      );

      let newQty;
      if (existing.length > 0) {
        const currentQty = parseFloat(existing[0].quantity);
        const delta = parseFloat(quantity);
        if (type === 'in')             newQty = currentQty + delta;
        else if (type === 'out')       newQty = currentQty - delta;
        else                           newQty = delta; // adjustment = set absolute
        await connection.query(
          'UPDATE inventory SET quantity = ? WHERE id = ?',
          [newQty, existing[0].id]
        );
      } else {
        newQty = type === 'out' ? -parseFloat(quantity) : parseFloat(quantity);
        await connection.query(
          'INSERT INTO inventory (product_id, user_id, shop_id, quantity) VALUES (?, ?, ?, ?)',
          [productId, userId, shopId, newQty]
        );
      }

      // Log stock movement
      await connection.query(
        `INSERT INTO stock_movements
           (product_id, user_id, shop_id, type, quantity, reference_type, reference_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, userId, shopId, type, quantity,
          referenceType || null, referenceId || null, notes || null]
      );

      await connection.commit();
      logger.info(`Stock ${type}: product=${productId}, qty=${quantity}, shop=${shopId}`);
      return { newQuantity: newQty };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update min/max stock levels and location without creating a stock movement.
   */
  async updateStockLevels(shopId, productId, { min_stock_level, max_stock_level, location }) {
    const pool = getPool();
    const [existing] = await pool.query(
      'SELECT id FROM inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    if (existing.length === 0) return; // Row doesn't exist yet — levels saved when first stock added

    const fields = [];
    const values = [];
    if (min_stock_level !== undefined) { fields.push('min_stock_level = ?'); values.push(min_stock_level); }
    if (max_stock_level !== undefined) { fields.push('max_stock_level = ?'); values.push(max_stock_level); }
    if (location !== undefined)        { fields.push('location = ?');         values.push(location); }
    if (fields.length === 0) return;

    values.push(existing[0].id);
    await pool.query(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

module.exports = new InventoryService();
