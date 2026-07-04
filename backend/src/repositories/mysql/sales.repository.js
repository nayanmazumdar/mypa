const { getPool } = require('../../config/db');

class SalesRepository {
  findAll(userId, { limit = 20, offset = 0, status = null, startDate = null, endDate = null } = {}) {
    const db = getPool();
    let sql = `SELECT s.*, c.name as customer_name
               FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
               WHERE s.user_id = ?`;
    const params = [userId];
    if (status) { sql += ` AND s.status = ?`; params.push(status); }
    if (startDate) { sql += ` AND s.sale_date >= ?`; params.push(startDate); }
    if (endDate) { sql += ` AND s.sale_date <= ?`; params.push(endDate); }
    sql += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  }

  count(userId, { status = null, startDate = null, endDate = null } = {}) {
    const db = getPool();
    let sql = `SELECT COUNT(*) as total FROM sales WHERE user_id = ?`;
    const params = [userId];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (startDate) { sql += ` AND sale_date >= ?`; params.push(startDate); }
    if (endDate) { sql += ` AND sale_date <= ?`; params.push(endDate); }
    return db.prepare(sql).get(...params)?.total || 0;
  }

  findById(id, userId) {
    const db = getPool();
    return db.prepare(`SELECT s.*, c.name as customer_name
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ? AND s.user_id = ?`).get(id, userId);
  }

  findItemsBySaleId(saleId) {
    const db = getPool();
    return db.prepare(`SELECT si.*, p.name as product_name, p.unit
      FROM sale_items si JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?`).all(saleId);
  }

  create(saleData, items) {
    const db = getPool();
    const insertSale = db.transaction(() => {
      const info = db.prepare(`INSERT INTO sales
        (uuid, user_id, customer_id, invoice_number, total_amount, discount, tax_amount, net_amount,
         payment_status, payment_method, status, notes, sale_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(saleData.uuid, saleData.user_id, saleData.customer_id || null,
        saleData.invoice_number, saleData.total_amount, saleData.discount,
        saleData.tax_amount, saleData.net_amount, saleData.payment_status,
        saleData.payment_method, saleData.status, saleData.notes || null, saleData.sale_date);

      const saleId = info.lastInsertRowid;
      for (const item of items) {
        db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total)
          VALUES (?, ?, ?, ?, ?, ?)`).run(saleId, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total);
      }
      return this.findById(saleId, saleData.user_id);
    });
    return insertSale();
  }

  updateStatus(id, userId, status) {
    const db = getPool();
    db.prepare(`UPDATE sales SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
      .run(status, id, userId);
    return this.findById(id, userId);
  }
}

module.exports = new SalesRepository();
