/**
 * Individual User Seeder
 * Creates a sample 'individual' role account with demo expenses, incomes, and tasks.
 *
 * Usage: node src/database/seed-individual.js
 *
 * Credentials:
 *   Email:    individual@mypa.com
 *   Password: MyPA@1234
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shopkeeper_db',
};

async function seedIndividual() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL');

    // ── User ─────────────────────────────────────────────────────────────────
    const password = await bcrypt.hash('MyPA@1234', 10);
    const uuid = uuidv4();
    const email = 'individual@mypa.com';

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`ℹ User already exists (id: ${userId}), skipping user creation.`);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO users (uuid, name, email, phone, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid, 'Arjun Das', email, '9812345678', password, 'individual']
      );
      userId = result.insertId;
      console.log(`✓ Individual user created (id: ${userId})`);
    }

    // ── Personal Incomes ─────────────────────────────────────────────────────
    console.log('\nSeeding personal incomes...');
    const incomes = [
      { source: 'Salary',    description: 'June monthly salary',       amount: 55000, method: 'bank_transfer', date: '2026-06-01' },
      { source: 'Freelance', description: 'Website design project',     amount: 12000, method: 'upi',           date: '2026-06-10' },
      { source: 'Bonus',     description: 'Performance bonus Q1',       amount: 8000,  method: 'bank_transfer', date: '2026-06-15' },
      { source: 'Salary',    description: 'July monthly salary',        amount: 55000, method: 'bank_transfer', date: '2026-07-01' },
      { source: 'Freelance', description: 'Mobile app UI consultation', amount: 7500,  method: 'upi',           date: '2026-07-03' },
    ];

    for (const inc of incomes) {
      await connection.execute(
        `INSERT INTO personal_incomes (uuid, user_id, source, description, amount, payment_method, income_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, inc.source, inc.description, inc.amount, inc.method, inc.date]
      );
    }
    console.log(`  ✓ ${incomes.length} income records seeded`);

    // ── Personal Expenses ────────────────────────────────────────────────────
    console.log('\nSeeding personal expenses...');
    const expenses = [
      { category: 'Housing & Rent',   description: 'Monthly apartment rent',     amount: 14000, method: 'bank_transfer', date: '2026-06-01' },
      { category: 'Food & Dining',    description: 'Groceries for the month',    amount: 4200,  method: 'upi',           date: '2026-06-05' },
      { category: 'Transport',        description: 'Monthly metro pass + Uber',  amount: 1800,  method: 'upi',           date: '2026-06-06' },
      { category: 'Utilities',        description: 'Electricity & internet bill',amount: 2100,  method: 'upi',           date: '2026-06-07' },
      { category: 'Healthcare',       description: 'Doctor consultation + meds', amount: 950,   method: 'cash',          date: '2026-06-12' },
      { category: 'Entertainment',    description: 'OTT subscriptions',          amount: 599,   method: 'card',          date: '2026-06-15' },
      { category: 'Savings & Investment', description: 'SIP mutual fund',        amount: 5000,  method: 'bank_transfer', date: '2026-06-20' },
      { category: 'Housing & Rent',   description: 'Monthly apartment rent',     amount: 14000, method: 'bank_transfer', date: '2026-07-01' },
      { category: 'Food & Dining',    description: 'Dining out + groceries',     amount: 3800,  method: 'upi',           date: '2026-07-04' },
      { category: 'Shopping',         description: 'Clothing purchase',          amount: 2500,  method: 'card',          date: '2026-07-05' },
    ];

    for (const exp of expenses) {
      await connection.execute(
        `INSERT INTO personal_expenses (uuid, user_id, category, description, amount, payment_method, expense_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, exp.category, exp.description, exp.amount, exp.method, exp.date]
      );
    }
    console.log(`  ✓ ${expenses.length} expense records seeded`);

    // ── Personal Tasks ───────────────────────────────────────────────────────
    console.log('\nSeeding personal tasks...');
    const tasks = [
      { title: 'Renew vehicle insurance',   priority: 'high',   status: 'pending',     due: '2026-07-10' },
      { title: 'File income tax return',    priority: 'high',   status: 'in_progress', due: '2026-07-15' },
      { title: 'Book annual health checkup',priority: 'medium', status: 'pending',     due: '2026-07-20' },
      { title: 'Update emergency fund',     priority: 'medium', status: 'pending',     due: '2026-07-25' },
      { title: 'Review monthly budget',     priority: 'medium', status: 'completed',   due: '2026-07-05' },
      { title: 'Cancel unused subscriptions',priority:'low',    status: 'pending',     due: '2026-07-12' },
      { title: 'Read personal finance book',priority: 'low',    status: 'in_progress', due: null },
    ];

    for (const task of tasks) {
      const completed_at = task.status === 'completed'
        ? '2026-07-05 10:00:00'
        : null;
      await connection.execute(
        `INSERT INTO personal_tasks (uuid, user_id, title, priority, status, due_date, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, task.title, task.priority, task.status, task.due, completed_at]
      );
    }
    console.log(`  ✓ ${tasks.length} tasks seeded`);

    console.log('\n✅ Individual user seeding completed!\n');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│       Individual Login Credentials       │');
    console.log('├─────────────────────────────────────────┤');
    console.log('│  Email   :  individual@mypa.com          │');
    console.log('│  Password:  MyPA@1234                    │');
    console.log('│  Role    :  individual                   │');
    console.log('└─────────────────────────────────────────┘');

  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('  → Run migration 007_individual.sql first.');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seedIndividual();
