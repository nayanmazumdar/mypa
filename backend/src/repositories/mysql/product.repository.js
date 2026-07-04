const { getPool } = require('../../config/db');
const { generateId } = require('../../utils/helper');

class ProductRepository {
  findAll(userId, { limit = 20, offset = 0, search = '', categoryId = null } = {}) {
    const db = getPool();
    let sql = `SELECT p.*, c.name as category_name,
               COALESCE(i.quantity, 0) as stock
               FROM products p
               LEFT JOIN categories c ON p.category_id = c.id
               LEFT JOIN inventory i ON i.product_id = p.id AND i.user_id = p.user_id
               WHERE p.user_id = ? AND p.is_active = 1`;
    const params = [userId];
    if (search) { sql += ` AND p.name LIKE ?`; params.push(`%${search}%`); }
    if (categoryId) { sql += ` AND p.category_id = ?`; params.push(categoryId); }
    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  }

  count(userId, { search = '', categoryId = null } = {}) {
    const db = getPool();
    let sql = `SELECT COUNT(*) as total FROM products WHERE user_id = ? AND is_active = 1`;
    const params = [userId];
    if (search) { sql += ` AND name LIKE ?`; params.push(`%${search}%`); }
    if (categoryId) { sql += ` AND category_id = ?`; params.push(categoryId); }
    return db.prepare(sql).get(...params)?.total || 0;
  }

  findById(id, userId) {
    const db = getPool();
    return db.prepare(`SELECT p.*, c.name as category_name,
      COALESCE(i.quantity, 0) as stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON i.product_id = p.id AND i.user_id = p.user_id
      WHERE p.id = ? AND p.user_id = ?`).get(id, userId);
  }

  create(data) {
    const db = getPool();
    const info = db.prepare(`INSERT INTO products
      (uuid, user_id, category_id, name, sku, barcode, description, purchase_price, selling_price, unit, tax_rate, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(data.uuid, data.user_id, data.category_id || null, data.name,
      data.sku || null, data.barcode || null, data.description || null,
      data.purchase_price, data.selling_price, data.unit || 'piece',
      data.tax_rate || 0, data.image_url || null);

    // Create inventory record
    db.prepare(`INSERT OR IGNORE INTO inventory (product_id, user_id, quantity) VALUES (?, ?, 0)`)
      .run(info.lastInsertRowid, data.user_id);

    return this.findById(info.lastInsertRowid, data.user_id);
  }

  update(id, userId, data) {
    const db = getPool();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE products SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
      .run(...Object.values(data), id, userId);
    return this.findById(id, userId);
  }

  delete(id, userId) {
    const db = getPool();
    db.prepare(`UPDATE products SET is_active = 0 WHERE id = ? AND user_id = ?`).run(id, userId);
  }
}

module.exports = new ProductRepository();
