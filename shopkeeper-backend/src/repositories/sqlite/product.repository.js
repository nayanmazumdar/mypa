const { getDb } = require('../../config/sqlite');

class ProductSqliteRepository {
  findAll(userId, { limit, offset, search, categoryId }) {
    const db = getDb();
    let query = 'SELECT * FROM products WHERE user_id = ?';
    const params = [userId];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(query).all(...params);
  }

  count(userId, { search, categoryId }) {
    const db = getDb();
    let query = 'SELECT COUNT(*) as total FROM products WHERE user_id = ?';
    const params = [userId];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }

    return db.prepare(query).get(...params).total;
  }

  findById(id, userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(id, userId) || null;
  }

  findByUuid(uuid, userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM products WHERE uuid = ? AND user_id = ?').get(uuid, userId) || null;
  }

  create(data) {
    const db = getDb();
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const result = db.prepare(
      `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`
    ).run(...values);

    return { id: result.lastInsertRowid, ...data };
  }

  update(id, userId, data) {
    const db = getDb();
    const fields = Object.keys(data).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id, userId];

    db.prepare(`UPDATE products SET ${fields} WHERE id = ? AND user_id = ?`).run(...values);
    return this.findById(id, userId);
  }

  delete(id, userId) {
    const db = getDb();
    const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  }
}

module.exports = new ProductSqliteRepository();
