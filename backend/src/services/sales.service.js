const { getPool } = require('../config/db');
const { generateId, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const inventoryService = require('./inventory.service');
const logger = require('../config/logger');

/**
 * Generate invoice number in format INV-YYYYMMDD-XXXX
 * Auto-increments based on the highest existing suffix for the given date.
 */
function generateInvoiceNumber(db, businessId) {
  const dateStr = formatDate(new Date()).replace(/-/g, ''); // e.g. "20240115"
  const prefix = `INV-${dateStr}-`;

  const row = db.prepare(
    `SELECT invoice_number FROM sales
     WHERE business_id = ? AND invoice_number LIKE ?
     ORDER BY invoice_number DESC LIMIT 1`
  ).get(businessId, `${prefix}%`);

  let seq = 1;
  if (row) {
    const parts = row.invoice_number.split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last)) seq = last + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

class SalesService {
  /**
   * Create a sale with line items, stock decrement, and optional credit transaction.
   * Uses a SQLite transaction so all inserts are atomic.
   */
  create(businessId, userId, data) {
    const db = getPool();

    if (!data.items || !data.items.length) {
      const e = new Error('Sale must have at least one item');
      e.statusCode = 400;
      throw e;
    }

    const doCreate = db.transaction(() => {
      const uuid = generateId();
      const invoiceNumber = generateInvoiceNumber(db, businessId);

      // Calculate line totals
      let totalAmount = 0;
      const items = data.items.map(item => {
        const lineDiscount = Number(item.discount) || 0;
        const lineTotal = (Number(item.quantity) * Number(item.unit_price)) - lineDiscount;
        totalAmount += lineTotal;
        return { ...item, total: lineTotal };
      });

      const discount  = Number(data.discount)   || 0;
      const taxAmount = Number(data.tax_amount)  || 0;
      const netAmount = totalAmount - discount + taxAmount;
      const saleDate  = data.sale_date || formatDate(new Date());
      const paymentStatus = data.payment_method === 'credit' ? 'unpaid' : 'paid';

      // Insert sale
      const saleInfo = db.prepare(
        `INSERT INTO sales
         (uuid, business_id, customer_id, invoice_number, total_amount, discount,
          tax_amount, net_amount, payment_status, payment_method, status, notes, sale_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, datetime('now'), datetime('now'))`
      ).run(
        uuid,
        businessId,
        data.customer_id || null,
        invoiceNumber,
        totalAmount,
        discount,
        taxAmount,
        netAmount,
        paymentStatus,
        data.payment_method || 'cash',
        data.notes || null,
        saleDate
      );

      const saleId = saleInfo.lastInsertRowid;

      // Insert line items and decrement inventory
      const insertItem = db.prepare(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const item of items) {
        insertItem.run(
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
          Number(item.discount) || 0,
          item.total
        );

        // Decrement inventory stock for each line item
        inventoryService.addStock(
          businessId,
          item.product_id,
          Number(item.quantity),
          'out',
          'sale',
          saleId
        );
      }

      // If credit sale → insert credit_transaction record
      if (data.payment_method === 'credit' && data.customer_id) {
        db.prepare(
          `INSERT INTO credit_transactions
           (uuid, business_id, customer_id, type, amount, note, date, created_at)
           VALUES (?, ?, ?, 'sale_credit', ?, ?, ?, datetime('now'))`
        ).run(
          generateId(),
          businessId,
          data.customer_id,
          netAmount,
          `Invoice ${invoiceNumber}`,
          saleDate
        );
      }

      logger.info(`Sale created: ${invoiceNumber} for business ${businessId}`);
      return saleId;
    });

    const saleId = doCreate();
    return this.getById(saleId, businessId);
  }

  /**
   * List sales for a business with optional date range, customer filter, and pagination.
   */
  getAll(businessId, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    let sql = `
      SELECT s.*, c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.business_id = ?`;
    const params = [businessId];

    if (query.status) {
      sql += ' AND s.status = ?';
      params.push(query.status);
    }
    if (query.start_date) {
      sql += ' AND s.sale_date >= ?';
      params.push(query.start_date);
    }
    if (query.end_date) {
      sql += ' AND s.sale_date <= ?';
      params.push(query.end_date);
    }
    if (query.customer_id) {
      sql += ' AND s.customer_id = ?';
      params.push(query.customer_id);
    }

    const countSql = sql.replace(
      /SELECT s\.\*, c\.name AS customer_name/,
      'SELECT COUNT(*) AS total'
    );
    const { total } = db.prepare(countSql).get(...params);

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const sales = db.prepare(sql).all(...params);

    return { sales, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Get a single sale with its line items.
   */
  getById(id, businessId) {
    const db = getPool();
    const sale = db.prepare(
      `SELECT s.*, c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ? AND s.business_id = ?`
    ).get(id, businessId);

    if (!sale) {
      const e = new Error('Sale not found');
      e.statusCode = 404;
      throw e;
    }

    sale.items = db.prepare(
      `SELECT si.*, p.name AS product_name, p.unit
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`
    ).all(id);

    return sale;
  }

  /**
   * Update sale status or notes.
   */
  update(id, businessId, data) {
    const db = getPool();
    this.getById(id, businessId); // validates existence

    const fields = [];
    const params = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      params.push(data.notes);
    }
    if (data.payment_status !== undefined) {
      fields.push('payment_status = ?');
      params.push(data.payment_status);
    }

    if (fields.length === 0) {
      return this.getById(id, businessId);
    }

    fields.push("updated_at = datetime('now')");
    params.push(id, businessId);

    db.prepare(
      `UPDATE sales SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`
    ).run(...params);

    return this.getById(id, businessId);
  }

  /**
   * Delete a sale and its line items.
   */
  delete(id, businessId) {
    const db = getPool();
    this.getById(id, businessId); // validates existence

    db.transaction(() => {
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
      db.prepare('DELETE FROM sales WHERE id = ? AND business_id = ?').run(id, businessId);
    })();

    logger.info(`Sale deleted: id=${id}, business=${businessId}`);
    return true;
  }

  /**
   * Get today's sales summary + list for a business.
   */
  getToday(businessId) {
    const db = getPool();
    const today = formatDate(new Date());

    const summary = db.prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(net_amount), 0) AS total
       FROM sales
       WHERE business_id = ? AND sale_date = ? AND status != 'cancelled'`
    ).get(businessId, today);

    const sales = db.prepare(
      `SELECT s.*, c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.business_id = ? AND s.sale_date = ?
       ORDER BY s.created_at DESC`
    ).all(businessId, today);

    return { summary, sales };
  }

  /**
   * Get monthly sales grouped by day for a business.
   */
  getMonthly(businessId, query = {}) {
    const db = getPool();
    const year  = query.year  || new Date().getFullYear();
    const month = query.month || (new Date().getMonth() + 1);
    const pad   = String(month).padStart(2, '0');
    const prefix = `${year}-${pad}`;

    return db.prepare(
      `SELECT strftime('%Y-%m-%d', sale_date) AS date,
              COUNT(*) AS count,
              COALESCE(SUM(net_amount), 0) AS total
       FROM sales
       WHERE business_id = ? AND sale_date LIKE ? AND status != 'cancelled'
       GROUP BY date
       ORDER BY date`
    ).all(businessId, `${prefix}%`);
  }

  /**
   * Get all sales for a specific customer within a business.
   */
  getByCustomer(customerId, businessId) {
    const db = getPool();
    return db.prepare(
      `SELECT s.*, c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.customer_id = ? AND s.business_id = ?
       ORDER BY s.sale_date DESC`
    ).all(customerId, businessId);
  }
}

module.exports = new SalesService();
