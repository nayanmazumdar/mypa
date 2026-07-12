const { getPool } = require('../config/db');

/**
 * BaseRepository — lightweight query builder for MySQL.
 * Provides standard CRUD + filtering + pagination without an ORM.
 *
 * Usage:
 *   class CustomerRepo extends BaseRepository {
 *     constructor() { super('customers'); }
 *   }
 */
class BaseRepository {
  constructor(tableName, options = {}) {
    this.table = tableName;
    this.primaryKey = options.primaryKey || 'id';
    this.shopScoped = options.shopScoped !== false; // default true
  }

  get pool() {
    return getPool();
  }

  // ─── Core Queries ─────────────────────────────────────────────────────────

  /**
   * Find all rows with optional filters, search, sorting, and pagination.
   */
  async findAll(shopId, { limit = 20, offset = 0, orderBy = 'created_at DESC', where = {}, search = null, searchFields = [] } = {}) {
    let query = `SELECT * FROM ${this.table}`;
    const params = [];
    const conditions = [];

    if (this.shopScoped && shopId) {
      conditions.push('shop_id = ?');
      params.push(shopId);
    }

    // Static where conditions
    for (const [field, value] of Object.entries(where)) {
      if (value !== undefined && value !== null && value !== '') {
        conditions.push(`${field} = ?`);
        params.push(value);
      }
    }

    // Search across multiple fields
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map(f => `${f} LIKE ?`);
      conditions.push(`(${searchConditions.join(' OR ')})`);
      const term = `%${search}%`;
      searchFields.forEach(() => params.push(term));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await this.pool.query(query, params);
    return rows;
  }

  /**
   * Count rows matching filters (for pagination).
   */
  async count(shopId, { where = {}, search = null, searchFields = [] } = {}) {
    let query = `SELECT COUNT(*) as total FROM ${this.table}`;
    const params = [];
    const conditions = [];

    if (this.shopScoped && shopId) {
      conditions.push('shop_id = ?');
      params.push(shopId);
    }

    for (const [field, value] of Object.entries(where)) {
      if (value !== undefined && value !== null && value !== '') {
        conditions.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map(f => `${f} LIKE ?`);
      conditions.push(`(${searchConditions.join(' OR ')})`);
      const term = `%${search}%`;
      searchFields.forEach(() => params.push(term));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [rows] = await this.pool.query(query, params);
    return rows[0].total;
  }

  /**
   * Find a single row by primary key (+ shop scope).
   */
  async findById(id, shopId) {
    let query = `SELECT * FROM ${this.table} WHERE ${this.primaryKey} = ?`;
    const params = [id];

    if (this.shopScoped && shopId) {
      query += ' AND shop_id = ?';
      params.push(shopId);
    }

    const [rows] = await this.pool.query(query, params);
    return rows[0] || null;
  }

  /**
   * Find rows by a specific field.
   */
  async findBy(field, value, shopId) {
    let query = `SELECT * FROM ${this.table} WHERE ${field} = ?`;
    const params = [value];

    if (this.shopScoped && shopId) {
      query += ' AND shop_id = ?';
      params.push(shopId);
    }

    const [rows] = await this.pool.query(query, params);
    return rows;
  }

  /**
   * Find one row by a specific field.
   */
  async findOneBy(field, value, shopId) {
    const rows = await this.findBy(field, value, shopId);
    return rows[0] || null;
  }

  /**
   * Insert a new row. Returns the created object with the inserted ID.
   */
  async create(data) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const [result] = await this.pool.query(
      `INSERT INTO ${this.table} (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return { id: result.insertId, ...data };
  }

  /**
   * Update a row by primary key (+ shop scope).
   */
  async update(id, shopId, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const params = [...Object.values(data), id];

    let query = `UPDATE ${this.table} SET ${fields} WHERE ${this.primaryKey} = ?`;
    if (this.shopScoped && shopId) {
      query += ' AND shop_id = ?';
      params.push(shopId);
    }

    const [result] = await this.pool.query(query, params);
    return result.affectedRows > 0;
  }

  /**
   * Delete a row by primary key (+ shop scope).
   */
  async delete(id, shopId) {
    let query = `DELETE FROM ${this.table} WHERE ${this.primaryKey} = ?`;
    const params = [id];

    if (this.shopScoped && shopId) {
      query += ' AND shop_id = ?';
      params.push(shopId);
    }

    const [result] = await this.pool.query(query, params);
    return result.affectedRows > 0;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /**
   * Execute a raw query (for complex joins, etc.).
   */
  async raw(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  /**
   * Get a connection for transactions.
   */
  async getConnection() {
    return this.pool.getConnection();
  }

  /**
   * Execute within a transaction. Handles commit/rollback.
   * @param {Function} fn - receives (connection) => Promise
   */
  async transaction(fn) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Paginated query helper — returns { data, pagination }.
   */
  async paginate(shopId, { page = 1, limit = 20, ...options } = {}) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.findAll(shopId, { limit, offset, ...options }),
      this.count(shopId, options),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = BaseRepository;
