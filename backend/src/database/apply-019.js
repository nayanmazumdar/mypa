/**
 * apply-019.js
 * Fixes shop ownership: removes admin@shopkeeper.com as admin of "Demo General Store"
 * (which is owned by demo@shopkeeper.com) and creates a separate "Admin Shop" for them.
 *
 * Safe to run multiple times — uses INSERT IGNORE and conditional deletes.
 *
 * Usage: node src/database/apply-019.js
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shopkeeper_db',
};

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log(`\nConnected to MySQL → ${config.database}\n`);

    // Get admin user
    const [[adminUser]] = await conn.execute(
      "SELECT id FROM users WHERE email = 'admin@shopkeeper.com'"
    );
    if (!adminUser) {
      console.log('  ↩ admin@shopkeeper.com not found — skipping');
      return;
    }

    // Get Demo General Store shop
    const [[demoShop]] = await conn.execute(
      "SELECT id FROM shops WHERE name = 'Demo General Store' LIMIT 1"
    );

    // Remove admin@shopkeeper.com from Demo General Store if present
    if (demoShop) {
      const [result] = await conn.execute(
        "DELETE FROM user_shops WHERE user_id = ? AND shop_id = ? AND role = 'admin'",
        [adminUser.id, demoShop.id]
      );
      if (result.affectedRows > 0) {
        console.log('  ✓ Removed admin@shopkeeper.com as admin of "Demo General Store"');
      } else {
        console.log('  ↩ admin@shopkeeper.com was not admin of "Demo General Store" — skipped');
      }
    }

    // Check if admin already has their own shop
    const [[existingAdminShop]] = await conn.execute(
      "SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin' LIMIT 1",
      [adminUser.id]
    );

    if (existingAdminShop) {
      console.log(`  ↩ admin@shopkeeper.com already owns a shop (id: ${existingAdminShop.shop_id}) — skipped creation`);
      // Update user's shop_id to point to their own shop
      await conn.execute('UPDATE users SET shop_id = ? WHERE id = ?', [existingAdminShop.shop_id, adminUser.id]);
    } else {
      // Create "Admin Shop" for admin@shopkeeper.com
      const shopUuid = uuidv4();
      await conn.execute(
        `INSERT INTO shops (uuid, name, address, phone, email, owner_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [shopUuid, 'Admin Shop', '123 Admin Street', '9876543210', 'admin@shopkeeper.com', adminUser.id]
      );
      const [[newShop]] = await conn.execute("SELECT id FROM shops WHERE uuid = ?", [shopUuid]);
      await conn.execute(
        'INSERT INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?)',
        [adminUser.id, newShop.id, 'admin']
      );
      await conn.execute('UPDATE users SET shop_id = ? WHERE id = ?', [newShop.id, adminUser.id]);
      console.log(`  ✓ Created "Admin Shop" (id: ${newShop.id}) for admin@shopkeeper.com`);
    }

    console.log('\n✅ Migration 019 applied successfully.\n');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
