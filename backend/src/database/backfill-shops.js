/**
 * Backfill script: Creates shops for existing users and assigns data.
 * Usage: node src/database/backfill-shops.js
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function backfill() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  console.log('Backfilling shop_id for existing data...\n');

  // Get all users without a shop
  const [users] = await conn.execute('SELECT id, name, email, shop_name FROM users WHERE shop_id IS NULL');

  for (const user of users) {
    // Create a shop for this user
    const [r] = await conn.execute(
      'INSERT INTO shops (uuid, name, owner_id, email) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.shop_name || user.name + "'s Shop", user.id, user.email]
    );
    const shopId = r.insertId;
    await conn.execute('UPDATE users SET shop_id = ? WHERE id = ?', [shopId, user.id]);
    console.log(`User "${user.name}" (${user.email}) -> Shop ID ${shopId}`);

    // Backfill all data tables
    const tables = ['categories','products','customers','suppliers','inventory',
      'stock_movements','sales','purchases','payments','pos_transactions','expenses','daily_summary'];

    for (const table of tables) {
      try {
        const [result] = await conn.execute(
          `UPDATE ${table} SET shop_id = ? WHERE user_id = ? AND (shop_id IS NULL OR shop_id = 0)`,
          [shopId, user.id]
        );
        if (result.affectedRows > 0) {
          console.log(`  ${table}: ${result.affectedRows} rows`);
        }
      } catch (e) {
        // Table might not have the column yet, skip
      }
    }
  }

  if (users.length === 0) {
    console.log('All users already have shops assigned.');
  }

  console.log('\n✅ Backfill complete!');
  await conn.end();
}

backfill().catch(e => { console.error('Failed:', e.message); process.exit(1); });
