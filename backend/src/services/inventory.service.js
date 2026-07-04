const { getPool } = require('../config/db');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class InventoryService {
  /**
   * List inventory items for a business, optionally filtered by low stock.
   * JOINs products to expose product name and SKU.
   * @param {number} businessId
   * @param {object} query - { page, limit, low_stock }
   */
  getAll(businessId, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    const lowStockFilter =
      query.low_stock === 'true' || query.low_stock === true
        ? ' AND i.quantity <= i.min_stock_level'
        : '';

    const rows = db.prepare(`
      SELECT
        i.id,
        i.product_id,
        i.business_id,
        i.quantity,
        i.min_stock_level,
        i.max_stock_level,
        i.location,
        i.updated_at,
        p.name  AS product_name,
        p.sku   AS product_sku
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE i.business_id = ?${lowStockFilter}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(businessId, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total
      FROM inventory i
      WHERE i.business_id = ?${lowStockFilter}
    `).get(businessId);

    return {
      items: rows,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Manual stock adjustment: can add or subtract quantity.
   * Updates inventory.quantity and inserts a stock_movements record.
   * @param {number} businessId
   * @param {object} data - { productId, quantity (can be negative), reason, type? }
   */
  adjust(businessId, data) {
    const db = getPool();

    const { productId, quantity, reason, type = 'adjustment' } = data;

    if (!productId) {
      const err = new Error('productId is required');
      err.statusCode = 400;
      throw err;
    }

    if (quantity === undefined || quantity === null) {
      const err = new Error('quantity is required');
      err.statusCode = 400;
      throw err;
    }

    // Verify the product belongs to this business
    const product = db.prepare(
      'SELECT id FROM products WHERE id = ? AND business_id = ?'
    ).get(productId, businessId);

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const doAdjustment = db.transaction(() => {
      // Upsert inventory record
      const existing = db.prepare(
        'SELECT id, quantity FROM inventory WHERE product_id = ? AND business_id = ?'
      ).get(productId, businessId);

      let newQuantity;

      if (existing) {
        newQuantity = existing.quantity + Number(quantity);
        db.prepare(`
          UPDATE inventory
          SET quantity = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newQuantity, existing.id);
      } else {
        newQuantity = Number(quantity);
        const uuid = generateId();
        db.prepare(`
          INSERT INTO inventory (product_id, business_id, quantity, min_stock_level, max_stock_level)
          VALUES (?, ?, ?, 0, 0)
        `).run(productId, businessId, newQuantity);
      }

      // Log the movement
      db.prepare(`
        INSERT INTO stock_movements
          (product_id, business_id, type, quantity, notes, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(productId, businessId, type, Number(quantity), reason || null);

      logger.info(
        `Stock adjusted: product=${productId}, businessId=${businessId}, delta=${quantity}, newQty=${newQuantity}`
      );

      return { product_id: productId, quantity_delta: quantity, new_quantity: newQuantity };
    });

    return doAdjustment();
  }

  /**
   * List stock movements for a business, with optional productId filter and pagination.
   * @param {number} businessId
   * @param {object} query - { page, limit, productId }
   */
  getMovements(businessId, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    const whereClauses = ['sm.business_id = ?'];
    const params = [businessId];

    if (query.productId) {
      whereClauses.push('sm.product_id = ?');
      params.push(query.productId);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;

    const rows = db.prepare(`
      SELECT
        sm.id,
        sm.product_id,
        sm.business_id,
        sm.type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.notes,
        sm.created_at,
        p.name AS product_name,
        p.sku  AS product_sku
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ${where}
      ORDER BY sm.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total
      FROM stock_movements sm
      ${where}
    `).get(...params);

    return {
      movements: rows,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Legacy helpers (used by sales/purchase services) ────────────────────────

  /**
   * Get a single inventory record by userId + productId (legacy).
   */
  getStock(userId, productId) {
    const db = getPool();
    return db.prepare(
      'SELECT * FROM inventory WHERE user_id = ? AND product_id = ?'
    ).get(userId, productId) || null;
  }

  /**
   * Increment or decrement stock for a product within a business (used by sales/purchase flows).
   * @param {number}  businessId
   * @param {number}  productId
   * @param {number}  quantity      - always positive
   * @param {string}  type          - 'in' | 'out' | 'adjustment'
   * @param {string}  [referenceType]
   * @param {*}       [referenceId]
   * @param {string}  [notes]
   */
  addStock(businessId, productId, quantity, type, referenceType, referenceId, notes) {
    const db = getPool();

    const existing = db.prepare(
      'SELECT * FROM inventory WHERE business_id = ? AND product_id = ?'
    ).get(businessId, productId);

    if (existing) {
      const newQty =
        type === 'in'
          ? existing.quantity + quantity
          : existing.quantity - quantity;
      db.prepare(
        "UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newQty, existing.id);
    } else {
      db.prepare(
        'INSERT INTO inventory (product_id, business_id, quantity, min_stock_level, max_stock_level) VALUES (?, ?, ?, 0, 0)'
      ).run(productId, businessId, type === 'in' ? quantity : -quantity);
    }

    db.prepare(`
      INSERT INTO stock_movements
        (product_id, business_id, type, quantity, reference_type, reference_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      productId,
      businessId,
      type,
      quantity,
      referenceType || null,
      referenceId || null,
      notes || null
    );

    logger.info(`Stock ${type}: product=${productId}, qty=${quantity}, businessId=${businessId}`);
  }
}

module.exports = new InventoryService();
