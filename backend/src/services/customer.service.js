const { getPool } = require('../config/db');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class CustomerService {
  /**
   * Create a new customer linked to a business.
   * @param {number} businessId
   * @param {object} data - { name, phone, alternate_mobile, email, address, occupation, credit_limit, notes, reference_person }
   */
  create(businessId, data) {
    const db = getPool();

    if (!data.name) {
      const error = new Error('Customer name is required');
      error.statusCode = 400;
      throw error;
    }

    const uuid = generateId();
    const info = db.prepare(`
      INSERT INTO customers
        (uuid, user_id, business_id, name, email, phone, alternate_mobile,
         address, occupation, credit_limit, notes, reference_person, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      uuid,
      data.user_id || null,
      businessId,
      data.name,
      data.email || null,
      data.phone || null,
      data.alternate_mobile || null,
      data.address || null,
      data.occupation || null,
      data.credit_limit != null ? data.credit_limit : 0,
      data.notes || null,
      data.reference_person || null
    );

    const customerId = info.lastInsertRowid;
    logger.info(`Customer created: "${data.name}" for businessId=${businessId}`);
    return this.getById(customerId, businessId);
  }

  /**
   * List customers for a business with optional search and pagination.
   * @param {number} businessId
   * @param {object} query - { page, limit, q (search term) }
   */
  getAll(businessId, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    let whereClauses = ['business_id = ?'];
    const params = [businessId];

    if (query.q) {
      whereClauses.push('(name LIKE ? OR phone LIKE ?)');
      const term = `%${query.q}%`;
      params.push(term, term);
    }

    if (query.is_active !== undefined) {
      whereClauses.push('is_active = ?');
      params.push(query.is_active === 'true' || query.is_active === '1' ? 1 : 0);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;

    const rows = db.prepare(`
      SELECT id, uuid, user_id, business_id, name, email, phone, alternate_mobile,
             address, occupation, credit_limit, notes, reference_person, is_active,
             created_at, updated_at
      FROM customers
      ${where}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total FROM customers ${where}
    `).get(...params);

    return {
      customers: rows,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single customer by id, ensuring it belongs to the given business.
   * @param {number} id
   * @param {number} businessId
   */
  getById(id, businessId) {
    const db = getPool();

    const customer = db.prepare(`
      SELECT id, uuid, user_id, business_id, name, email, phone, alternate_mobile,
             address, occupation, credit_limit, notes, reference_person, is_active,
             created_at, updated_at
      FROM customers
      WHERE id = ? AND business_id = ?
    `).get(id, businessId);

    if (!customer) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    // Compute outstanding balance live
    const { outstanding } = db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN type = 'sale_credit'  THEN  amount
          WHEN type = 'payment_cash' THEN -amount
          ELSE 0
        END
      ), 0) AS outstanding
      FROM credit_transactions
      WHERE customer_id = ? AND business_id = ?
    `).get(id, businessId);

    return { ...customer, outstanding_balance: outstanding };
  }

  /**
   * Update a customer's fields.
   * @param {number} id
   * @param {number} businessId
   * @param {object} data - fields to update
   */
  update(id, businessId, data) {
    const db = getPool();

    const customer = db.prepare(
      'SELECT id FROM customers WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!customer) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const allowed = [
      'name', 'email', 'phone', 'alternate_mobile',
      'address', 'occupation', 'credit_limit',
      'notes', 'reference_person', 'is_active',
    ];

    const updates = {};
    allowed.forEach(f => {
      if (data[f] !== undefined) updates[f] = data[f];
    });

    if (Object.keys(updates).length === 0) return this.getById(id, businessId);

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`
      UPDATE customers
      SET ${set}, updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).run(...Object.values(updates), id, businessId);

    logger.info(`Customer updated: id=${id}, businessId=${businessId}`);
    return this.getById(id, businessId);
  }

  /**
   * Delete (soft-delete) a customer by setting is_active = 0.
   * Pass hard=true to physically remove the record.
   * @param {number} id
   * @param {number} businessId
   * @param {boolean} [hard=false]
   */
  delete(id, businessId, hard = false) {
    const db = getPool();

    const customer = db.prepare(
      'SELECT id FROM customers WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!customer) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    if (hard) {
      db.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').run(id, businessId);
      logger.info(`Customer hard-deleted: id=${id}, businessId=${businessId}`);
    } else {
      db.prepare(`
        UPDATE customers SET is_active = 0, updated_at = datetime('now')
        WHERE id = ? AND business_id = ?
      `).run(id, businessId);
      logger.info(`Customer soft-deleted: id=${id}, businessId=${businessId}`);
    }

    return { deleted: true, hard };
  }

  /**
   * Search customers by name or mobile (phone) within a business.
   * @param {number} businessId
   * @param {string} q - search term
   */
  search(businessId, q) {
    const db = getPool();

    if (!q || !q.trim()) {
      return [];
    }

    const term = `%${q.trim()}%`;
    const rows = db.prepare(`
      SELECT id, uuid, business_id, name, email, phone, alternate_mobile,
             address, occupation, credit_limit, is_active, created_at
      FROM customers
      WHERE business_id = ? AND is_active = 1 AND (name LIKE ? OR phone LIKE ?)
      ORDER BY name ASC
      LIMIT 50
    `).all(businessId, term, term);

    return rows;
  }

  /**
   * Get all active customers for a business with their outstanding balance.
   * Outstanding = sum(sale_credit) - sum(payment_cash) per customer.
   * @param {number} businessId
   */
  getOutstanding(businessId) {
    const db = getPool();

    const rows = db.prepare(`
      SELECT
        c.id,
        c.uuid,
        c.name,
        c.phone,
        c.email,
        c.credit_limit,
        c.is_active,
        COALESCE(SUM(
          CASE
            WHEN ct.type = 'sale_credit'  THEN  ct.amount
            WHEN ct.type = 'payment_cash' THEN -ct.amount
            ELSE 0
          END
        ), 0) AS outstanding_balance
      FROM customers c
      LEFT JOIN credit_transactions ct
        ON ct.customer_id = c.id AND ct.business_id = ?
      WHERE c.business_id = ? AND c.is_active = 1
      GROUP BY c.id
      ORDER BY outstanding_balance DESC
    `).all(businessId, businessId);

    return rows;
  }

  /**
   * Get all credit_transactions for a customer with a running balance.
   * @param {number} customerId
   * @param {number} businessId
   */
  getHistory(customerId, businessId) {
    const db = getPool();

    // Verify the customer belongs to this business
    const customer = db.prepare(`
      SELECT id, name, phone, credit_limit
      FROM customers
      WHERE id = ? AND business_id = ?
    `).get(customerId, businessId);

    if (!customer) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const transactions = db.prepare(`
      SELECT id, uuid, type, amount, note, bill_photo, date, created_at
      FROM credit_transactions
      WHERE customer_id = ? AND business_id = ?
      ORDER BY date ASC, created_at ASC
    `).all(customerId, businessId);

    // Build running balance
    let runningBalance = 0;
    const history = transactions.map(tx => {
      if (tx.type === 'sale_credit') {
        runningBalance += tx.amount;
      } else if (tx.type === 'payment_cash') {
        runningBalance -= tx.amount;
      }
      return { ...tx, running_balance: runningBalance };
    });

    return {
      customer,
      transactions: history,
      current_balance: runningBalance,
    };
  }
}

module.exports = new CustomerService();
