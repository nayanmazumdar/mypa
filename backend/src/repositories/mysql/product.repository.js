const { getPool } = require('../../config/db');

class ProductRepository {
  async findAll(userId, { limit, offset, search, categoryId }) {
    const pool = getPool();
    let query = 'SELECT * FROM products WHERE shop_id = ?';
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

    const [rows] = await pool.query(query, params);
    return rows;
  }

  async count(userId, { search, categoryId }) {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM products WHERE shop_id = ?';
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

    const [rows] = await pool.query(query, params);
    return rows[0].total;
  }

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND shop_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  async findByUuid(uuid, userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE uuid = ? AND shop_id = ?',
      [uuid, userId]
    );
    return rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const [result] = await pool.query(
      `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return { id: result.insertId, ...data };
  }

  async update(id, userId, data) {
    const pool = getPool();
    const fields = Object.keys(data).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id, userId];

    await pool.query(
      `UPDATE products SET ${fields} WHERE id = ? AND shop_id = ?`,
      values
    );
    return this.findById(id, userId);
  }

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM products WHERE id = ? AND shop_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new ProductRepository();
