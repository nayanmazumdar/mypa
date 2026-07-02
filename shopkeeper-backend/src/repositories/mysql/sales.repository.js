const { getPool } = require('../../config/mysql');

class SalesRepository {
  async findAll(userId, { limit, offset, status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND s.sale_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND s.sale_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  async count(userId, { status, startDate, endDate }) {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM sales WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND sale_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND sale_date <= ?';
      params.push(endDate);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ? AND s.user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  async findItemsBySaleId(saleId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [saleId]
    );
    return rows;
  }

  async create(saleData, items) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const fields = Object.keys(saleData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(saleData);

      const [saleResult] = await connection.execute(
        `INSERT INTO sales (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const saleId = saleResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total]
        );
      }

      await connection.commit();
      return { id: saleId, ...saleData };
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
      'UPDATE sales SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, userId]
    );
    return this.findById(id, userId);
  }
}

module.exports = new SalesRepository();
