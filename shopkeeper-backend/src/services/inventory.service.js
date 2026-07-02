const { getPool } = require('../config/db');
const logger = require('../config/logger');

class InventoryService {
  async getStock(userId, productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM inventory WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows[0] || null;
  }

  async getAllStock(userId, { limit, offset }) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT i.*, p.name as product_name, p.sku
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.user_id = ?
       ORDER BY p.name ASC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM inventory WHERE user_id = ?',
      [userId]
    );
    return { items: rows, total: countResult[0].total };
  }

  async getLowStock(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT i.*, p.name as product_name, p.sku
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.user_id = ? AND i.quantity <= i.min_stock_level`,
      [userId]
    );
    return rows;
  }

  async addStock(userId, productId, quantity, type, referenceType, referenceId, notes) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update or insert inventory
      const [existing] = await connection.execute(
        'SELECT * FROM inventory WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );

      if (existing.length > 0) {
        const newQty = type === 'in'
          ? existing[0].quantity + quantity
          : existing[0].quantity - quantity;
        await connection.execute(
          'UPDATE inventory SET quantity = ? WHERE id = ?',
          [newQty, existing[0].id]
        );
      } else {
        await connection.execute(
          'INSERT INTO inventory (product_id, user_id, quantity) VALUES (?, ?, ?)',
          [productId, userId, type === 'in' ? quantity : -quantity]
        );
      }

      // Log stock movement
      await connection.execute(
        'INSERT INTO stock_movements (product_id, user_id, type, quantity, reference_type, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [productId, userId, type, quantity, referenceType || null, referenceId || null, notes || null]
      );

      await connection.commit();
      logger.info(`Stock ${type}: product ${productId}, qty ${quantity}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new InventoryService();
