const { getPool } = require('../config/db');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class ProductService {
  // ── Products ─────────────────────────────────────────────────────────

  /**
   * Create a new product linked to a business.
   * @param {number} businessId
   * @param {number} userId
   * @param {object} data - product fields
   */
  create(businessId, userId, data) {
    const db = getPool();

    if (!data.name) {
      const error = new Error('Product name is required');
      error.statusCode = 400;
      throw error;
    }

    const uuid = generateId();
    const info = db.prepare(`
      INSERT INTO products
        (uuid, user_id, business_id, category_id, name, sku, barcode,
         description, purchase_price, selling_price, unit, tax_rate,
         image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      uuid,
      userId,
      businessId,
      data.category_id || null,
      data.name,
      data.sku || null,
      data.barcode || null,
      data.description || null,
      data.purchase_price != null ? data.purchase_price : 0,
      data.selling_price != null ? data.selling_price : 0,
      data.unit || 'piece',
      data.tax_rate != null ? data.tax_rate : 0,
      data.image_url || null
    );

    logger.info(`Product created: "${data.name}" for businessId=${businessId}`);
    return this.getById(info.lastInsertRowid, businessId);
  }

  /**
   * List all products for a business with optional search, category filter, and pagination.
   * @param {number} businessId
   * @param {object} query - { page, limit, q (search), category_id, is_active }
   */
  getAll(businessId, query = {}) {
    const db = getPool();
    const { page, limit, offset } = parsePagination(query);

    const whereClauses = ['p.business_id = ?'];
    const params = [businessId];

    if (query.q) {
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ?)');
      const term = `%${query.q}%`;
      params.push(term, term);
    }

    if (query.category_id) {
      whereClauses.push('p.category_id = ?');
      params.push(parseInt(query.category_id, 10));
    }

    if (query.is_active !== undefined) {
      whereClauses.push('p.is_active = ?');
      params.push(query.is_active === 'true' || query.is_active === '1' ? 1 : 0);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;

    const products = db.prepare(`
      SELECT p.id, p.uuid, p.user_id, p.business_id, p.category_id,
             p.name, p.sku, p.barcode, p.description,
             p.purchase_price, p.selling_price, p.unit, p.tax_rate,
             p.image_url, p.is_active, p.created_at, p.updated_at,
             c.name AS category_name,
             COALESCE(i.quantity, 0) AS stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id AND i.business_id = p.business_id
      ${where}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total FROM products p ${where}
    `).get(...params);

    return {
      products,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single product by id, scoped to a business.
   * @param {number} id
   * @param {number} businessId
   */
  getById(id, businessId) {
    const db = getPool();

    const product = db.prepare(`
      SELECT p.id, p.uuid, p.user_id, p.business_id, p.category_id,
             p.name, p.sku, p.barcode, p.description,
             p.purchase_price, p.selling_price, p.unit, p.tax_rate,
             p.image_url, p.is_active, p.created_at, p.updated_at,
             c.name AS category_name,
             COALESCE(i.quantity, 0) AS stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id AND i.business_id = p.business_id
      WHERE p.id = ? AND p.business_id = ?
    `).get(id, businessId);

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    return product;
  }

  /**
   * Update a product's fields.
   * @param {number} id
   * @param {number} businessId
   * @param {object} data - fields to update
   */
  update(id, businessId, data) {
    const db = getPool();

    const existing = db.prepare(
      'SELECT id FROM products WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!existing) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const allowed = [
      'category_id', 'name', 'sku', 'barcode', 'description',
      'purchase_price', 'selling_price', 'unit', 'tax_rate',
      'image_url', 'is_active',
    ];

    const updates = {};
    allowed.forEach(f => {
      if (data[f] !== undefined) updates[f] = data[f];
    });

    if (Object.keys(updates).length === 0) return this.getById(id, businessId);

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`
      UPDATE products
      SET ${set}, updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).run(...Object.values(updates), id, businessId);

    logger.info(`Product updated: id=${id}, businessId=${businessId}`);
    return this.getById(id, businessId);
  }

  /**
   * Delete a product (hard delete).
   * @param {number} id
   * @param {number} businessId
   */
  delete(id, businessId) {
    const db = getPool();

    const existing = db.prepare(
      'SELECT id FROM products WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!existing) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    db.prepare('DELETE FROM products WHERE id = ? AND business_id = ?').run(id, businessId);
    logger.info(`Product deleted: id=${id}, businessId=${businessId}`);
    return { deleted: true };
  }

  /**
   * Search products by name or SKU within a business (active products only).
   * @param {number} businessId
   * @param {string} q - search term
   */
  search(businessId, q) {
    const db = getPool();

    if (!q || !q.trim()) return [];

    const term = `%${q.trim()}%`;
    return db.prepare(`
      SELECT p.id, p.uuid, p.name, p.sku, p.barcode,
             p.selling_price, p.purchase_price, p.unit, p.tax_rate,
             COALESCE(i.quantity, 0) AS stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id AND i.business_id = p.business_id
      WHERE p.business_id = ? AND p.is_active = 1
        AND (p.name LIKE ? OR p.sku LIKE ?)
      ORDER BY p.name ASC
      LIMIT 50
    `).all(businessId, term, term);
  }

  // ── Categories ────────────────────────────────────────────────────────

  /**
   * List all active categories for a business.
   * @param {number} businessId
   */
  getAllCategories(businessId) {
    const db = getPool();
    return db.prepare(`
      SELECT id, uuid, business_id, name, is_active, created_at
      FROM categories
      WHERE business_id = ? AND (is_active IS NULL OR is_active = 1)
      ORDER BY name ASC
    `).all(businessId);
  }

  /**
   * Create a category for a business.
   * @param {number} businessId
   * @param {string} name
   */
  createCategory(businessId, name) {
    const db = getPool();

    if (!name || !name.trim()) {
      const error = new Error('Category name is required');
      error.statusCode = 400;
      throw error;
    }

    const uuid = generateId();
    const info = db.prepare(`
      INSERT INTO categories (uuid, business_id, name, is_active)
      VALUES (?, ?, ?, 1)
    `).run(uuid, businessId, name.trim());

    logger.info(`Category created: "${name}" for businessId=${businessId}`);
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  }

  /**
   * Update a category's name.
   * @param {number} id
   * @param {number} businessId
   * @param {string} name
   */
  updateCategory(id, businessId, name) {
    const db = getPool();

    const existing = db.prepare(
      'SELECT id FROM categories WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!existing) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    if (!name || !name.trim()) {
      const error = new Error('Category name is required');
      error.statusCode = 400;
      throw error;
    }

    db.prepare(
      'UPDATE categories SET name = ? WHERE id = ? AND business_id = ?'
    ).run(name.trim(), id, businessId);

    logger.info(`Category updated: id=${id}, businessId=${businessId}`);
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  /**
   * Delete a category (hard delete).
   * Products referencing this category will have category_id set to NULL (ON DELETE SET NULL).
   * @param {number} id
   * @param {number} businessId
   */
  deleteCategory(id, businessId) {
    const db = getPool();

    const existing = db.prepare(
      'SELECT id FROM categories WHERE id = ? AND business_id = ?'
    ).get(id, businessId);

    if (!existing) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    db.prepare('DELETE FROM categories WHERE id = ? AND business_id = ?').run(id, businessId);
    logger.info(`Category deleted: id=${id}, businessId=${businessId}`);
    return { deleted: true };
  }
}

module.exports = new ProductService();
