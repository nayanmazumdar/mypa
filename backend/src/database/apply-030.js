/**
 * apply-030.js
 * Seeds default RBAC roles with proper permissions.
 * Safe to run multiple times (uses INSERT IGNORE).
 *
 * Usage: node src/database/apply-030.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { getPool } = require('../config/db');

async function run() {
  const pool = getPool();
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '030_seed_default_roles.sql'),
    'utf8'
  );

  // Split by semicolons and run each statement
  const statements = sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`\nApplying migration 030: Seed default roles...`);
  console.log(`  ${statements.length} statements to execute\n`);

  let executed = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      const [result] = await pool.query(stmt);
      const affected = result.affectedRows || 0;
      executed++;
      if (affected > 0) {
        console.log(`  ✓ ${affected} row(s) affected`);
      } else {
        console.log(`  · already exists (skipped)`);
      }
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        skipped++;
        console.log(`  · duplicate entry (skipped)`);
      } else {
        console.error(`  ✗ Error: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Migration 030 complete: ${executed} executed, ${skipped} skipped\n`);

  // Show created roles
  const [roles] = await pool.query(
    `SELECT r.name, r.slug, r.description, COUNT(rp.id) AS permissions
     FROM rbac_roles r
     LEFT JOIN rbac_role_permissions rp ON rp.role_id = r.id
     WHERE r.slug IN ('cashier','store_manager','inventory_clerk','sales_executive','accountant')
     GROUP BY r.id
     ORDER BY r.name`
  );

  if (roles.length) {
    console.log('Default roles created:');
    console.log('─'.repeat(60));
    roles.forEach(r => {
      console.log(`  ${r.name.padEnd(18)} (${r.slug}) — ${r.permissions} permissions`);
      console.log(`  ${''.padEnd(18)} ${r.description}`);
    });
    console.log('─'.repeat(60));
  }

  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
