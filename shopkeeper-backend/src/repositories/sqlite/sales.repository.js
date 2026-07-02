const { getDb } = require('../../config/sqlite');

class SalesSqliteRepository {
  findAll(userId, { limit, offset, status, startDate, endDate }) {
    const db = getDb();
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

    return db.prepare(query).all(...params);
  }

  count(userId, { status, startDate, endDate }) {
    const db = getDb();
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

    return db.prepare(query).get(...params).total;
  }

  findById(id, userId) {
    const db = getDb();
    return db.prepare(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ? AND s.user_id = ?'
    ).get(id, userId) || null;
  }

  findItemsBySaleId(saleId) {
    const db = getDb();
    return db.prepare(
      'SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?'
    ).all(saleId);
  }

  create(saleData, items) {
    const db = getDb();
    const transaction = db.transaction(() => {
      const fields = Object.keys(saleData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(saleData);

      const result = db.prepare(
        `INSERT INTO sales (${fields.join(', ')}) VALUES (${placeholders})`
      ).run(...values);
      const saleId = result.lastInsertRowid;

      for (const item of items) {
        db.prepare(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(saleId, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total);
      }

      return { id: saleId, ...saleData };
    });

    return transaction();
  }

  updateStatus(id, userId, status) {
    const db = getDb();
    db.prepare('UPDATE sales SET status = ? WHERE id = ? AND user_id = ?').run(status, id, userId);
    return this.findById(id, userId);
  }
}

module.exports = new SalesSqliteRepository();
