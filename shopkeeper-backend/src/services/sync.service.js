const { getPool, getDb } = require('../config/db');
const logger = require('../config/logger');

/**
 * Sync service to keep SQLite offline DB in sync with MySQL
 */
class SyncService {
  /**
   * Sync products from MySQL to SQLite
   */
  async syncProducts(userId) {
    const pool = getPool();
    const db = getDb();

    try {
      const [products] = await pool.execute(
        'SELECT * FROM products WHERE user_id = ?',
        [userId]
      );

      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO products (id, uuid, user_id, category_id, name, sku, barcode, description,
        purchase_price, selling_price, unit, tax_rate, image_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items) => {
        for (const p of items) {
          insertStmt.run(
            p.id, p.uuid, p.user_id, p.category_id, p.name, p.sku, p.barcode, p.description,
            p.purchase_price, p.selling_price, p.unit, p.tax_rate, p.image_url, p.is_active,
            p.created_at, p.updated_at
          );
        }
      });

      insertMany(products);
      logger.info(`Synced ${products.length} products to SQLite for user ${userId}`);
      return { synced: products.length };
    } catch (error) {
      logger.error('Product sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync customers from MySQL to SQLite
   */
  async syncCustomers(userId) {
    const pool = getPool();
    const db = getDb();

    try {
      const [customers] = await pool.execute(
        'SELECT * FROM customers WHERE user_id = ?',
        [userId]
      );

      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO customers (id, uuid, user_id, name, email, phone, address, balance, notes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items) => {
        for (const c of items) {
          insertStmt.run(
            c.id, c.uuid, c.user_id, c.name, c.email, c.phone, c.address, c.balance, c.notes, c.is_active, c.created_at, c.updated_at
          );
        }
      });

      insertMany(customers);
      logger.info(`Synced ${customers.length} customers to SQLite for user ${userId}`);
      return { synced: customers.length };
    } catch (error) {
      logger.error('Customer sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload offline sales from SQLite to MySQL
   */
  async uploadOfflineSales(userId) {
    const pool = getPool();
    const db = getDb();

    try {
      const offlineSales = db.prepare(
        'SELECT * FROM sales WHERE user_id = ? AND synced = 0'
      ).all(userId);

      let uploaded = 0;
      for (const sale of offlineSales) {
        const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);

        const fields = Object.keys(sale).filter((k) => k !== 'synced');
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map((f) => sale[f]);

        await pool.execute(
          `INSERT IGNORE INTO sales (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );

        // Mark as synced
        db.prepare('UPDATE sales SET synced = 1 WHERE id = ?').run(sale.id);
        uploaded++;
      }

      logger.info(`Uploaded ${uploaded} offline sales for user ${userId}`);
      return { uploaded };
    } catch (error) {
      logger.error('Offline sales upload failed:', error.message);
      throw error;
    }
  }
}

module.exports = new SyncService();
