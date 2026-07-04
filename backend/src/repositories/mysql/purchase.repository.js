const { getPool } = require('../../config/db');

class PurchaseRepository {
  async findAll(userId, { limit, offset, status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND p.purchase_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND p.purchase_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  async count(userId, { status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM purchases WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND purchase_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND purchase_date <= ?';
      params.push(endDate);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ? AND p.user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  async findItemsByPurchaseId(purchaseId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT pi.*, p.name as product_name FROM purchase_items pi JOIN products p ON pi.product_id = p.id WHERE pi.purchase_id = ?',
      [purchaseId]
    );
    return rows;
  }

  async create(purchaseData, items) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const fields = Object.keys(purchaseData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(purchaseData);

      const [purchaseResult] = await connection.execute(
        `INSERT INTO purchases (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const purchaseId = purchaseResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
          [purchaseId, item.product_id, item.quantity, item.unit_price, item.total]
        );
      }

      await connection.commit();
      return { id: purchaseId, ...purchaseData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStatus(id, userId, status) {
    const pool = getPool();
    await pool.execute(
      'UPDATE purchases SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, userId]
    );
    return this.findById(id, userId);
  }
}

module.exports = new PurchaseRepository();
