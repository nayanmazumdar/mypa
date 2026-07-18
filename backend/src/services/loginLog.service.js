const { getPool } = require('../config/db');
const logger = require('../config/logger');

class LoginLogService {
  /**
   * Record a login event when a user selects a shop.
   * Returns the new log id so the client can send it back on logout.
   */
  async recordLogin(userId, shopId, role) {
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);
    const [result] = await pool.query(
      `INSERT INTO shop_login_logs (user_id, shop_id, role, login_at, date)
       VALUES (?, ?, ?, NOW(), ?)`,
      [userId, shopId, role, today]
    );
    logger.info(`Login log created: user=${userId} shop=${shopId} role=${role} log_id=${result.insertId}`);
    return result.insertId;
  }

  /**
   * Record logout by setting logout_at on the specific log entry.
   */
  async recordLogout(logId, userId) {
    const pool = getPool();
    await pool.query(
      `UPDATE shop_login_logs SET logout_at = NOW()
       WHERE id = ? AND user_id = ? AND logout_at IS NULL`,
      [logId, userId]
    );
    logger.info(`Logout recorded: log_id=${logId} user=${userId}`);
  }

  /**
   * Get all login logs for a shop on a given date (defaults to today).
   * Admin-only.
   */
  async getLogs(shopId, date) {
    const pool = getPool();
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT
         l.id, l.login_at, l.logout_at, l.role, l.date,
         u.name  AS user_name,
         u.email AS user_email,
         s.name  AS shop_name,
         CASE
           WHEN l.logout_at IS NOT NULL
           THEN TIMESTAMPDIFF(MINUTE, l.login_at, l.logout_at)
           ELSE NULL
         END AS duration_minutes
       FROM shop_login_logs l
       JOIN users u ON l.user_id = u.id
       JOIN shops s ON l.shop_id = s.id
       WHERE l.shop_id = ? AND l.date = ?
       ORDER BY l.login_at DESC`,
      [shopId, targetDate]
    );
    return { date: targetDate, logs: rows };
  }

  /**
   * Get login logs across ALL shops the admin owns for a given date.
   */
  async getLogsForAdmin(adminId, date) {
    const pool = getPool();
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT
         l.id, l.login_at, l.logout_at, l.role, l.date,
         u.name  AS user_name,
         u.email AS user_email,
         s.name  AS shop_name,
         CASE
           WHEN l.logout_at IS NOT NULL
           THEN TIMESTAMPDIFF(MINUTE, l.login_at, l.logout_at)
           ELSE NULL
         END AS duration_minutes
       FROM shop_login_logs l
       JOIN users u ON l.user_id = u.id
       JOIN shops s ON l.shop_id = s.id
       WHERE l.shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')
         AND l.date = ?
       ORDER BY l.login_at DESC`,
      [adminId, targetDate]
    );
    return { date: targetDate, logs: rows };
  }
}

module.exports = new LoginLogService();
