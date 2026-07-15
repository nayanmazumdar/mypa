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

  // ─── Monthly Budgets ─────────────────────────────────────────────────────────

  /**
   * Get all budget entries for the user, merged with their actual spending
   * for the given month (defaults to current month).
   *
   * Budgets are tracked at the MAJOR CATEGORY (group) level.
   * Spending is the SUM of all sub-category items that belong to each group.
   */
  async getBudgets(userId, { year, month } = {}) {
    const pool = getPool();
    const now = new Date();
    const y = parseInt(year)  || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period   = y * 100 + m;                                          // e.g. 202607
    const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`;
    const dateTo   = new Date(y, m, 0).toISOString().split('T')[0];

    // Sub-category → major group mapping (must stay in sync with frontend)
    const CATEGORY_GROUPS = {
      'Food & Dining': 'Food & Lifestyle', 'Groceries': 'Food & Lifestyle',
      'Personal Care': 'Food & Lifestyle', 'Clothing & Fashion': 'Food & Lifestyle',
      'Entertainment': 'Food & Lifestyle',
      'Housing & Rent': 'Housing & Utilities', 'Electricity': 'Housing & Utilities',
      'Water': 'Housing & Utilities', 'Gas': 'Housing & Utilities',
      'Internet & Phone': 'Housing & Utilities', 'Maintenance': 'Housing & Utilities',
      'Fuel': 'Transport', 'Public Transport': 'Transport', 'Vehicle EMI': 'Transport',
      'Vehicle Insurance': 'Transport', 'Parking & Tolls': 'Transport', 'Cab / Auto': 'Transport',
      'Doctor / Hospital': 'Health', 'Medicines': 'Health',
      'Health Insurance': 'Health', 'Gym & Fitness': 'Health',
      'School / College Fees': 'Education', 'Books & Stationery': 'Education',
      'Online Courses': 'Education', 'Coaching': 'Education',
      'Loan EMI': 'Finance', 'Credit Card Bill': 'Finance',
      'Insurance Premium': 'Finance', 'Savings & Investment': 'Finance', 'Tax Payment': 'Finance',
      'Gifts & Donations': 'Family & Social', 'Family Support': 'Family & Social',
      'Subscriptions': 'Family & Social', 'Travel & Vacation': 'Family & Social',
      'Flight Tickets': 'Travel & Tours', 'Train / Bus Tickets': 'Travel & Tours',
      'Hotel & Accommodation': 'Travel & Tours', 'Tour Package': 'Travel & Tours',
      'Travel Insurance': 'Travel & Tours', 'Sightseeing & Activities': 'Travel & Tours',
      'Food while Travelling': 'Travel & Tours', 'Visa & Passport Fees': 'Travel & Tours',
      'Travel Accessories': 'Travel & Tours', 'Other Travel': 'Travel & Tours',
      'Miscellaneous': 'Other', 'Other': 'Other',
    };

    // Saved budgets for the specific period only
    const [budgetRows] = await pool.query(
      'SELECT category AS grp, monthly_limit FROM personal_budgets WHERE user_id = ? AND budget_period = ?',
      [userId, period]
    );

    // Actual spending per sub-category for the month
    const [actuals] = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS spent
       FROM personal_expenses
       WHERE user_id = ? AND DATE(expense_date) BETWEEN ? AND ?
       GROUP BY category`,
      [userId, dateFrom, dateTo]
    );

    // Roll actuals up to group level
    const groupSpent = {};
    actuals.forEach(r => {
      const grp = CATEGORY_GROUPS[r.category] || 'Other';
      groupSpent[grp] = (groupSpent[grp] || 0) + parseFloat(r.spent);
    });

    const result = budgetRows.map(b => {
      const spent = groupSpent[b.grp] || 0;
      const limit = parseFloat(b.monthly_limit);
      return {
        category:      b.grp,
        monthly_limit: limit,
        spent,
        remaining:     limit - spent,
        exceeded:      limit > 0 && spent > limit,
        pct_used:      limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    });

    // Alerts: groups where spending exceeds the budget
    const alerts = result
      .filter(b => b.exceeded)
      .map(b => ({
        group:     b.category,
        limit:     b.monthly_limit,
        spent:     b.spent,
        overspent: b.spent - b.monthly_limit,
      }));

    return { period: { year: y, month: m, budget_period: period, from: dateFrom, to: dateTo }, budgets: result, alerts };
  }

  /**
   * Upsert a budget entry — category is a MAJOR GROUP name, scoped to a budget_period.
   * budget_period is a 6-digit integer: YYYYMM (e.g. 202607 for July 2026).
   */
  async upsertBudget(userId, { category, monthly_limit, year, month }) {
    const pool = getPool();
    const now = new Date();
    const y = parseInt(year)  || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period = y * 100 + m;

    await pool.query(
      `INSERT INTO personal_budgets (user_id, budget_period, category, monthly_limit)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit), updated_at = NOW()`,
      [userId, period, category, monthly_limit]
    );
    logger.info(`Budget upserted: user=${userId}, period=${period}, group="${category}", limit=${monthly_limit}`);
    return { category, monthly_limit, budget_period: period };
  }

  /**
   * Delete a budget entry for a major group within a specific period.
   * period is a 6-digit integer: YYYYMM (e.g. 202607).
   */
  async deleteBudget(userId, category, period) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM personal_budgets WHERE user_id = ? AND category = ? AND budget_period = ?',
      [userId, category, parseInt(period, 10)]
    );
    if (result.affectedRows === 0) {
      const e = new Error('Budget entry not found'); e.statusCode = 404; throw e;
    }
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

    // Opening balance = cumulative net before the period start date
    const [[preExpRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM personal_expenses
       WHERE user_id = ? AND DATE(expense_date) < ?`,
      [userId, dateFrom]
    );
    const [[preIncRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM personal_incomes
       WHERE user_id = ? AND DATE(income_date) < ?`,
      [userId, dateFrom]
    );

    const totalIncome = parseFloat(incTotals.total);
    const totalExpense = parseFloat(expTotals.total);
    const openingBalance = parseFloat(preIncRow.total) - parseFloat(preExpRow.total);
    const closingBalance = openingBalance + (totalIncome - totalExpense);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        opening_balance: openingBalance,
        closing_balance: closingBalance,
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
