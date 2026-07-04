const { getPool } = require('../config/db');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class BusinessService {
  /**
   * Create a business for a BUSINESS_OWNER user.
   * @param {number} userId
   * @param {object} data - { name, type, gst_number, logo_url, address, description, website }
   */
  create(userId, data) {
    const db = getPool();

    const existing = db.prepare('SELECT id FROM businesses WHERE user_id = ?').get(userId);
    if (existing) {
      const error = new Error('User already has a business registered');
      error.statusCode = 409;
      throw error;
    }

    const uuid = generateId();
    const info = db.prepare(`
      INSERT INTO businesses (uuid, user_id, name, type, gst_number, logo_url, address, description, website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid, userId,
      data.name,
      data.type || null,
      data.gst_number || null,
      data.logo_url || null,
      data.address || null,
      data.description || null,
      data.website || null
    );

    const businessId = info.lastInsertRowid;

    // Link business to user
    db.prepare("UPDATE users SET business_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(businessId, userId);

    // Create a default free subscription (30-day trial)
    const trialUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "INSERT INTO subscriptions (business_id, plan, active_until) VALUES (?, 'free', ?)"
    ).run(businessId, trialUntil);

    logger.info(`Business created: "${data.name}" for userId=${userId}`);
    return this.getById(businessId);
  }

  /**
   * Get a single business by its primary key id.
   * @param {number} id
   */
  getById(id) {
    const db = getPool();
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    return biz || null;
  }

  /**
   * Get a business by the owner's user_id.
   * @param {number} userId
   */
  getByUserId(userId) {
    const db = getPool();
    return db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(userId) || null;
  }

  /**
   * List businesses.
   *   - admin / super_admin → all businesses
   *   - business_owner      → only their own business
   * @param {number} userId
   * @param {string} role    - user's role string
   * @param {object} [query] - pagination params (page, limit)
   */
  getAll(userId, role, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    const isAdmin = ['admin', 'super_admin'].includes(role);

    let sql;
    let countSql;
    let params;
    let countParams;

    if (isAdmin) {
      sql = 'SELECT * FROM businesses ORDER BY created_at DESC LIMIT ? OFFSET ?';
      countSql = 'SELECT COUNT(*) as total FROM businesses';
      params = [limit, offset];
      countParams = [];
    } else {
      sql = 'SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      countSql = 'SELECT COUNT(*) as total FROM businesses WHERE user_id = ?';
      params = [userId, limit, offset];
      countParams = [userId];
    }

    const rows = db.prepare(sql).all(...params);
    const { total } = db.prepare(countSql).get(...countParams);

    return { businesses: rows, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Update business fields.
   * @param {number} id
   * @param {object} data - fields to update
   */
  update(id, data) {
    const db = getPool();

    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (!biz) {
      const error = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    const allowed = ['name', 'type', 'gst_number', 'logo_url', 'address', 'description', 'website', 'is_active', 'active_until'];
    const updates = {};
    allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

    if (Object.keys(updates).length === 0) return biz;

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE businesses SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(updates), id);

    logger.info(`Business updated: id=${id}`);
    return this.getById(id);
  }

  /**
   * Delete a business by id.
   * @param {number} id
   */
  delete(id) {
    const db = getPool();

    const biz = db.prepare('SELECT id FROM businesses WHERE id = ?').get(id);
    if (!biz) {
      const error = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    db.prepare('DELETE FROM businesses WHERE id = ?').run(id);
    logger.info(`Business deleted: id=${id}`);
    return { deleted: true };
  }

  /**
   * Dashboard data for a business.
   * Returns: today's sales total, today's collections, outstanding total,
   *          customer count, subscription status.
   * @param {number} businessId
   */
  getDashboard(businessId) {
    const db = getPool();

    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!biz) {
      const error = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Today's sales total (cash + credit, not cancelled)
    const { todaySales } = db.prepare(`
      SELECT COALESCE(SUM(net_amount), 0) AS todaySales
      FROM sales
      WHERE business_id = ? AND sale_date = ? AND status != 'cancelled'
    `).get(businessId, today);

    // Today's collections: payment_cash transactions recorded today
    const { todayCollections } = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS todayCollections
      FROM credit_transactions
      WHERE business_id = ? AND type = 'payment_cash' AND date = ?
    `).get(businessId, today);

    // Outstanding total = sum(sale_credit) - sum(payment_cash) across all customers
    const { outstandingTotal } = db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN type = 'sale_credit'   THEN  amount
          WHEN type = 'payment_cash'  THEN -amount
          ELSE 0
        END
      ), 0) AS outstandingTotal
      FROM credit_transactions
      WHERE business_id = ?
    `).get(businessId);

    // Active customer count linked to this business
    const { customerCount } = db.prepare(`
      SELECT COUNT(*) AS customerCount
      FROM customers
      WHERE business_id = ? AND is_active = 1
    `).get(businessId);

    // Latest subscription record
    const subscription = db.prepare(`
      SELECT plan, active_until, amount_paid, created_at
      FROM subscriptions
      WHERE business_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(businessId);

    return {
      todaySales,
      todayCollections,
      outstandingTotal,
      customerCount,
      subscription: subscription || { plan: 'free', active_until: null },
    };
  }

  /**
   * Statistics for a business.
   * Returns: monthly sales chart data (last 12 months), top 5 customers by outstanding balance.
   * @param {number} businessId
   */
  getStatistics(businessId) {
    const db = getPool();

    const biz = db.prepare('SELECT id FROM businesses WHERE id = ?').get(businessId);
    if (!biz) {
      const error = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    // Monthly sales: last 12 months, grouped by YYYY-MM, ascending order
    const monthlySalesRaw = db.prepare(`
      SELECT
        strftime('%Y-%m', sale_date) AS month,
        COALESCE(SUM(net_amount), 0)  AS total
      FROM sales
      WHERE business_id = ? AND status != 'cancelled'
        AND sale_date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(businessId);

    // Top 5 customers by outstanding balance
    const topCustomers = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.phone,
        COALESCE(SUM(
          CASE
            WHEN ct.type = 'sale_credit'   THEN  ct.amount
            WHEN ct.type = 'payment_cash'  THEN -ct.amount
            ELSE 0
          END
        ), 0) AS outstanding
      FROM customers c
      LEFT JOIN credit_transactions ct ON ct.customer_id = c.id AND ct.business_id = ?
      WHERE c.business_id = ?
      GROUP BY c.id
      ORDER BY outstanding DESC
      LIMIT 5
    `).all(businessId, businessId);

    return {
      monthlySales: monthlySalesRaw,
      topCustomers,
    };
  }

  /**
   * Admin action: approve or block a business.
   * @param {number} id
   * @param {number|boolean} isActive  - 1/true = approve, 0/false = block
   */
  setActive(id, isActive) {
    const db = getPool();

    const biz = db.prepare('SELECT id FROM businesses WHERE id = ?').get(id);
    if (!biz) {
      const error = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    db.prepare("UPDATE businesses SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(isActive ? 1 : 0, id);

    logger.info(`Business ${isActive ? 'approved' : 'blocked'}: id=${id}`);
    return this.getById(id);
  }
}

module.exports = new BusinessService();
