const { getPool } = require('../config/db');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');

class IndividualService {
  // ─── Dashboard Summary ───────────────────────────────────────────────────────

  async getDashboardSummary(userId, { from, to } = {}) {
    const pool = getPool();
    const today         = new Date().toISOString().split('T')[0];
    const firstOfMonth  = today.substring(0, 8) + '01';
    const dateFrom      = from || firstOfMonth;
    const dateTo        = to   || today;

    const [[expenseRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM personal_expenses WHERE user_id = ? AND DATE(expense_date) BETWEEN ? AND ?`,
      [userId, dateFrom, dateTo]
    );
    const [[incomeRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM personal_incomes WHERE user_id = ? AND DATE(income_date) BETWEEN ? AND ?`,
      [userId, dateFrom, dateTo]
    );
    const [[taskRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'pending' AND due_date = ? THEN 1 ELSE 0 END) AS due_today
       FROM personal_tasks WHERE user_id = ?`,
      [today, userId]
    );

    const totalExpense = parseFloat(expenseRow.total);
    const totalIncome  = parseFloat(incomeRow.total);

    return {
      period: { from: dateFrom, to: dateTo },
      total_income:   totalIncome,
      total_expense:  totalExpense,
      net_balance:    totalIncome - totalExpense,
      tasks: {
        total:     taskRow.total,
        completed: taskRow.completed,
        due_today: taskRow.due_today,
      },
    };
  }

  // ─── Personal Expenses ───────────────────────────────────────────────────────

  async getExpenses(userId, { page = 1, limit = 20, from, to, category } = {}) {
    const pool = getPool();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);
    const conditions = ['user_id = ?'];
    const params = [userId];

    if (from)     { conditions.push('DATE(expense_date) >= ?'); params.push(from); }
    if (to)       { conditions.push('DATE(expense_date) <= ?'); params.push(to); }
    if (category) { conditions.push('category = ?'); params.push(category); }

    const where = conditions.join(' AND ');
    const [rows] = await pool.query(
      `SELECT * FROM personal_expenses WHERE ${where} ORDER BY expense_date DESC, id DESC LIMIT ${lim} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM personal_expenses WHERE ${where}`, params
    );
    return { data: rows, pagination: { page, limit, total } };
  }

  async createExpense(userId, { category, description, amount, payment_method, expense_date, notes }) {
    const pool = getPool();
    const uuid = generateId();
    const [result] = await pool.query(
      `INSERT INTO personal_expenses (uuid, user_id, category, description, amount, payment_method, expense_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, userId, category, description || null, amount, payment_method || 'cash', expense_date, notes || null]
    );
    logger.info(`Personal expense created: user=${userId}, amount=${amount}`);
    return { id: result.insertId, uuid, category, amount, expense_date };
  }

  async updateExpense(userId, expenseId, data) {
    const pool = getPool();
    const [[expense]] = await pool.query(
      'SELECT id FROM personal_expenses WHERE id = ? AND user_id = ?', [expenseId, userId]
    );
    if (!expense) { const e = new Error('Expense not found'); e.statusCode = 404; throw e; }

    const { category, description, amount, payment_method, expense_date, notes } = data;
    const expDateOnly = expense_date ? expense_date.toString().substring(0, 10) : null;
    await pool.query(
      `UPDATE personal_expenses SET category=?, description=?, amount=?, payment_method=?, expense_date=?, notes=?
       WHERE id = ? AND user_id = ?`,
      [category, description || null, amount, payment_method || 'cash', expDateOnly, notes || null, expenseId, userId]
    );
    return { id: expenseId };
  }

  async deleteExpense(userId, expenseId) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM personal_expenses WHERE id = ? AND user_id = ?', [expenseId, userId]
    );
    if (result.affectedRows === 0) { const e = new Error('Expense not found'); e.statusCode = 404; throw e; }
  }

  // ─── Personal Incomes ────────────────────────────────────────────────────────

  async getIncomes(userId, { page = 1, limit = 20, from, to, source } = {}) {
    const pool = getPool();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);
    const conditions = ['user_id = ?'];
    const params = [userId];

    if (from)   { conditions.push('DATE(income_date) >= ?'); params.push(from); }
    if (to)     { conditions.push('DATE(income_date) <= ?'); params.push(to); }
    if (source) { conditions.push('source = ?'); params.push(source); }

    const where = conditions.join(' AND ');
    const [rows] = await pool.query(
      `SELECT * FROM personal_incomes WHERE ${where} ORDER BY income_date DESC, id DESC LIMIT ${lim} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM personal_incomes WHERE ${where}`, params
    );
    return { data: rows, pagination: { page, limit, total } };
  }

  async createIncome(userId, { source, description, amount, payment_method, income_date, notes }) {
    const pool = getPool();
    const uuid = generateId();
    const [result] = await pool.query(
      `INSERT INTO personal_incomes (uuid, user_id, source, description, amount, payment_method, income_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, userId, source, description || null, amount, payment_method || 'cash', income_date, notes || null]
    );
    logger.info(`Personal income created: user=${userId}, amount=${amount}`);
    return { id: result.insertId, uuid, source, amount, income_date };
  }

  async updateIncome(userId, incomeId, data) {
    const pool = getPool();
    const [[income]] = await pool.query(
      'SELECT id FROM personal_incomes WHERE id = ? AND user_id = ?', [incomeId, userId]
    );
    if (!income) { const e = new Error('Income not found'); e.statusCode = 404; throw e; }

    const { source, description, amount, payment_method, income_date, notes } = data;
    const incDateOnly = income_date ? income_date.toString().substring(0, 10) : null;
    await pool.query(
      `UPDATE personal_incomes SET source=?, description=?, amount=?, payment_method=?, income_date=?, notes=?
       WHERE id = ? AND user_id = ?`,
      [source, description || null, amount, payment_method || 'cash', incDateOnly, notes || null, incomeId, userId]
    );
    return { id: incomeId };
  }

  async deleteIncome(userId, incomeId) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM personal_incomes WHERE id = ? AND user_id = ?', [incomeId, userId]
    );
    if (result.affectedRows === 0) { const e = new Error('Income not found'); e.statusCode = 404; throw e; }
  }

  // ─── Personal Tasks ──────────────────────────────────────────────────────────

  async getTasks(userId, { page = 1, limit = 50, status, priority, due_date } = {}) {
    const pool = getPool();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);
    const conditions = ['user_id = ?'];
    const params = [userId];

    if (status)   { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (due_date) { conditions.push('due_date = ?'); params.push(due_date); }

    const where = conditions.join(' AND ');
    const [rows] = await pool.query(
      `SELECT * FROM personal_tasks WHERE ${where} ORDER BY
         FIELD(status, 'in_progress', 'pending', 'completed', 'cancelled'),
         FIELD(priority, 'high', 'medium', 'low'),
         due_date ASC, id DESC LIMIT ${lim} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM personal_tasks WHERE ${where}`, params
    );
    return { data: rows, pagination: { page, limit, total } };
  }

  async createTask(userId, { title, description, priority, due_date }) {
    const pool = getPool();
    const uuid = generateId();
    // Strip time component if full ISO timestamp passed
    const dateOnly = due_date ? due_date.toString().substring(0, 10) : null;
    const [result] = await pool.query(
      `INSERT INTO personal_tasks (uuid, user_id, title, description, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, userId, title, description || null, priority || 'medium', dateOnly]
    );
    logger.info(`Personal task created: user=${userId}, title="${title}"`);
    return { id: result.insertId, uuid, title, priority, status: 'pending' };
  }

  async updateTask(userId, taskId, data) {
    const pool = getPool();
    const [[task]] = await pool.query(
      'SELECT id, status FROM personal_tasks WHERE id = ? AND user_id = ?', [taskId, userId]
    );
    if (!task) { const e = new Error('Task not found'); e.statusCode = 404; throw e; }

    const { title, description, priority, status, due_date } = data;
    // Strip time component if full ISO timestamp passed
    const dateOnly = due_date ? due_date.toString().substring(0, 10) : null;

    const completed_at = status === 'completed' && task.status !== 'completed'
      ? new Date().toISOString().slice(0, 19).replace('T', ' ')
      : (status !== 'completed' ? null : undefined);

    const completedAtClause = completed_at !== undefined ? ', completed_at = ?' : '';
    const extraParams = completed_at !== undefined ? [completed_at] : [];

    await pool.query(
      `UPDATE personal_tasks SET title=?, description=?, priority=?, status=?, due_date=?${completedAtClause}
       WHERE id = ? AND user_id = ?`,
      [title, description || null, priority || 'medium', status || 'pending', dateOnly, ...extraParams, taskId, userId]
    );
    return { id: taskId };
  }

  async deleteTask(userId, taskId) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM personal_tasks WHERE id = ? AND user_id = ?', [taskId, userId]
    );
    if (result.affectedRows === 0) { const e = new Error('Task not found'); e.statusCode = 404; throw e; }
  }

  // ─── Report ──────────────────────────────────────────────────────────────────

  async getReport(userId, { from, to }) {
    const pool = getPool();
    const dateFrom = from || new Date().toISOString().substring(0, 8) + '01';
    const dateTo = to || new Date().toISOString().split('T')[0];

    const [expenses] = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM personal_expenses WHERE user_id = ? AND DATE(expense_date) BETWEEN ? AND ?
       GROUP BY category ORDER BY total DESC`,
      [userId, dateFrom, dateTo]
    );
    const [incomes] = await pool.query(
      `SELECT source, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM personal_incomes WHERE user_id = ? AND DATE(income_date) BETWEEN ? AND ?
       GROUP BY source ORDER BY total DESC`,
      [userId, dateFrom, dateTo]
    );
    const [[expTotals]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM personal_expenses
       WHERE user_id = ? AND DATE(expense_date) BETWEEN ? AND ?`,
      [userId, dateFrom, dateTo]
    );
    const [[incTotals]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM personal_incomes
       WHERE user_id = ? AND DATE(income_date) BETWEEN ? AND ?`,
      [userId, dateFrom, dateTo]
    );

    const totalIncome = parseFloat(incTotals.total);
    const totalExpense = parseFloat(expTotals.total);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: totalIncome - totalExpense,
        savings_rate: totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0,
      },
      expense_by_category: expenses,
      income_by_source: incomes,
    };
  }
}

module.exports = new IndividualService();
