/**
 * Apply migration 012: personal_budgets table
 * Run: node src/database/apply-012.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { getPool, initDatabase } = require('../config/db');

async function run() {
  await initDatabase();
  const pool = getPool();
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '012_personal_budgets.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✅  Migration 012 applied: personal_budgets table created');
  } catch (err) {
    console.error('❌  Migration 012 failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
