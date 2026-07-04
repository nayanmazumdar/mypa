const { getPool } = require('../config/db');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class PurchaseService {
  getAll(userId, query) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);
    let sql = `SELECT p.*, s.name as supplier_name
               FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
               WHERE p.user_id = ?`;
    const params = [userId];
    if (query.status)     { sql += ' AND p.status = ?';         params.push(query.status); }
    if (query.start_date) { sql += ' AND p.purchase_date >= ?'; params.push(query.start_date); }
    if (query.end_date)   { sql += ' AND p.purchase_date <= ?'; params.push(query.end_date); }
    const total = db.prepare(
      `SELECT COUNT(*) as total FROM purchases p WHERE p.user_id = ?`
    ).get(userId).total;
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return { purchases: db.prepare(sql).all(...params),
             pagination: buildPaginationMeta(total, page, limit) };
  }

  getById(id, userId) {
    const db = getPool();
    const purchase = db.prepare(
      `SELECT p.*, s.name as supplier_name
       FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ? AND p.user_id = ?`
    ).get(id, userId);
    if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
    purchase.items = db.prepare(
      `SELECT pi.*, pr.name as product_name FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id WHERE pi.purchase_id = ?`
    ).all(id);
    return purchase;
  }

  create(userId, data) {
    const db = getPool();
    if (!data.items || !data.items.length) {
      const e = new Error('Purchase must have at least one item'); e.statusCode = 400; throw e;
    }
    const uuid = generateId();
    let totalAmount = 0;
    const items = data.items.map(item => {
      const total = item.quantity * item.unit_price;
      totalAmount += total;
      return { ...item, total };
    });
    const discount  = data.discount   || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;
    const purchaseDate = data.purchase_date || formatDate(new Date());

    const info = db.prepare(
      `INSERT INTO purchases
       (uuid, user_id, supplier_id, invoice_number, total_amount, discount,
        tax_amount, net_amount, payment_status, payment_method, status, notes, purchase_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
    ).run(uuid, userId, data.supplier_id || null, data.invoice_number || null,
      totalAmount, discount, taxAmount, netAmount,
      data.payment_method === 'credit' ? 'unpaid' : 'paid',
      data.payment_method || 'cash', data.notes || null, purchaseDate);

    const purchaseId = info.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      insertItem.run(purchaseId, item.product_id, item.quantity, item.unit_price, item.total);
    }

    logger.info(`Purchase created: ${uuid}`);
    return this.getById(purchaseId, userId);
  }

  updateStatus(id, userId, status) {
    const db = getPool();
    this.getById(id, userId);
    db.prepare(
      `UPDATE purchases SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
    ).run(status, id, userId);
    return this.getById(id, userId);
  }

  delete(id, userId) {
    const db = getPool();
    this.getById(id, userId);
    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id);
    db.prepare('DELETE FROM purchases WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  }
}

module.exports = new PurchaseService();
