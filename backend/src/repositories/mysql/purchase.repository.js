const { getPool } = require('../../config/db');

class PurchaseRepository {
  async findAll(userId, { limit, offset, status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.shop_id = ?';
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

    const [rows] = await pool.query(query, params);
    return rows;
  }

  async count(userId, { status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM purchases WHERE shop_id = ?';
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

    const [rows] = await pool.query(query, params);
    return rows[0].total;
  }

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ? AND p.shop_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  async findItemsByPurchaseId(purchaseId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT pi.*,
              COALESCE(p.name, pi.manual_name, 'Unknown Item') AS product_name
       FROM purchase_items pi
       LEFT JOIN products p ON pi.product_id = p.id
       WHERE pi.purchase_id = ?`,
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

      const [purchaseResult] = await connection.query(
        `INSERT INTO purchases (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const purchaseId = purchaseResult.insertId;

      for (const item of items) {
        await connection.query(
          'INSERT INTO purchase_items (purchase_id, product_id, manual_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
          [purchaseId, item.product_id || null, item.manual_name || null, item.quantity, item.unit_price, item.total]
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
    await pool.query(
      'UPDATE purchases SET status = ? WHERE id = ? AND shop_id = ?',
      [status, id, userId]
    );
    return this.findById(id, userId);
  }

  async clearDue(id, userId, netAmount) {
    const pool = getPool();
    await pool.query(
      `UPDATE purchases 
       SET paid_amount    = ?,
           due_amount     = 0,
           original_due_amount = CASE WHEN original_due_amount = 0 THEN net_amount ELSE original_due_amount END,
           payment_status = 'paid'
       WHERE id = ? AND shop_id = ?`,
      [netAmount, id, userId]
    );
    return this.findById(id, userId);
  }
}

module.exports = new PurchaseRepository();
