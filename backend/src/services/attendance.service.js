const { getPool } = require('../config/db');
const logger = require('../config/logger');

class AttendanceService {
  /**
   * Upsert attendance record for a staff member on a given date.
   * One record per user per shop per day.
   */
  async saveAttendance(shopId, recordedBy, { user_id, date, check_in, check_out, role, shop_status, notes }) {
    const pool = getPool();

    const [[membership]] = await pool.query(
      'SELECT us.role FROM user_shops us WHERE us.user_id = ? AND us.shop_id = ?',
      [user_id, shopId]
    );
    if (!membership) {
      const e = new Error('Staff member not found in this shop'); e.statusCode = 404; throw e;
    }

    await pool.query(
      `INSERT INTO staff_attendance (user_id, shop_id, date, check_in, check_out, role, shop_status, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in    = VALUES(check_in),
         check_out   = VALUES(check_out),
         role        = VALUES(role),
         shop_status = VALUES(shop_status),
         notes       = VALUES(notes),
         recorded_by = VALUES(recorded_by)`,
      [user_id, shopId, date, check_in || null, check_out || null,
       role || membership.role, shop_status || 'open', notes || null, recordedBy]
    );

    const [[record]] = await pool.query(
      `SELECT sa.*, u.name as staff_name, u.email as staff_email
       FROM staff_attendance sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.user_id = ? AND sa.shop_id = ? AND sa.date = ?`,
      [user_id, shopId, date]
    );

    logger.info(`Attendance recorded for user ${user_id} on ${date} in shop ${shopId}`);
    return record;
  }

  /**
   * Get attendance records for a shop (used from shop-scoped token).
   * Optional filters: date, user_id.
   */
  async getAttendance(shopId, { date, user_id } = {}) {
    const pool = getPool();
    let sql = `
      SELECT sa.*, u.name as staff_name, u.email as staff_email,
             rb.name as recorded_by_name
      FROM staff_attendance sa
      JOIN users u  ON sa.user_id = u.id
      JOIN users rb ON sa.recorded_by = rb.id
      WHERE sa.shop_id = ?`;
    const params = [shopId];

    if (date)    { sql += ' AND sa.date = ?';    params.push(date); }
    if (user_id) { sql += ' AND sa.user_id = ?'; params.push(user_id); }

    sql += ' ORDER BY sa.date DESC, sa.check_in ASC';

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Get today's attendance snapshot for all staff in the shop (shop-scoped token).
   */
  async getTodayAttendance(shopId) {
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT u.id as user_id, u.name, u.email, us.role, us.designation,
              sa.id as attendance_id, sa.date, sa.check_in, sa.check_out,
              sa.shop_status, sa.notes
       FROM user_shops us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN staff_attendance sa
         ON sa.user_id = us.user_id AND sa.shop_id = us.shop_id AND sa.date = ?
       WHERE us.shop_id = ? AND us.role != 'admin'
       ORDER BY u.name ASC`,
      [today, shopId]
    );
    return { date: today, records: rows };
  }

  // ── Admin-panel methods (no shop-scoped token needed) ──────────────────────

  /**
   * Get attendance records for a specific shop.
   * No owner check — route-level admin guard handles auth.
   */
  async getAttendanceForShop(shopId, { date, dateFrom, dateTo, userId } = {}) {
    const pool = getPool();

    let sql = `
      SELECT sa.*,
             u.name  AS staff_name,  u.email AS staff_email,
             rb.name AS recorded_by_name,
             s.name  AS shop_name
      FROM staff_attendance sa
      JOIN users  u  ON sa.user_id     = u.id
      JOIN users  rb ON sa.recorded_by = rb.id
      JOIN shops  s  ON sa.shop_id     = s.id
      WHERE sa.shop_id = ?`;
    const params = [shopId];

    if (userId)   { sql += ' AND sa.user_id = ?';  params.push(userId); }
    if (date)     { sql += ' AND sa.date = ?';     params.push(date); }
    if (dateFrom) { sql += ' AND sa.date >= ?';    params.push(dateFrom); }
    if (dateTo)   { sql += ' AND sa.date <= ?';    params.push(dateTo); }

    sql += ' ORDER BY sa.date DESC, sa.check_in ASC';

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Today's attendance snapshot for a specific shop (admin panel).
   */
  async getTodayForShop(shopId) {
    const pool = getPool();
    const [[shop]] = await pool.query('SELECT id, name FROM shops WHERE id = ?', [shopId]);
    if (!shop) return null;

    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, us.role, us.designation,
              sa.id AS attendance_id, sa.date, sa.check_in, sa.check_out,
              sa.shop_status, sa.notes
       FROM user_shops us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN staff_attendance sa
         ON sa.user_id = us.user_id AND sa.shop_id = us.shop_id AND sa.date = ?
       WHERE us.shop_id = ? AND us.role != 'admin'
       ORDER BY u.name ASC`,
      [today, shopId]
    );
    return { date: today, shop_name: shop.name, records: rows };
  }
}

module.exports = new AttendanceService();
