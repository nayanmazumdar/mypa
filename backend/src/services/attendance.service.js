const { getPool } = require('../config/db');
const logger = require('../config/logger');

class AttendanceService {
  /**
   * Upsert attendance record for a staff member on a given date.
   * Creates a new record or updates an existing one (one record per user per shop per day).
   */
  async saveAttendance(shopId, recordedBy, { user_id, date, check_in, check_out, role, shop_status, notes }) {
    const pool = getPool();

    // Verify the staff belongs to this shop
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
   * Get attendance records for the shop — optionally filtered by date or staff.
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
   * Get today's attendance snapshot for all staff in the shop.
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
}

module.exports = new AttendanceService();
