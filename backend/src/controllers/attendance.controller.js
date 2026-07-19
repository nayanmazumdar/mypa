const attendanceService = require('../services/attendance.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class AttendanceController {
  async save(req, res) {
    try {
      const record = await attendanceService.saveAttendance(
        req.user.shop_id,
        req.user.id,
        req.body
      );
      return ApiResponse.success(res, record, 'Attendance saved');
    } catch (error) {
      logger.error('Save attendance error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getAll(req, res) {
    try {
      const { date, user_id } = req.query;
      const records = await attendanceService.getAttendance(req.user.shop_id, { date, user_id });
      return ApiResponse.success(res, records);
    } catch (error) {
      logger.error('Get attendance error:', error.message);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async getToday(req, res) {
    try {
      const data = await attendanceService.getTodayAttendance(req.user.shop_id);
      return ApiResponse.success(res, data);
    } catch (error) {
      logger.error('Get today attendance error:', error.message);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async getAllForAdmin(req, res) {
    try {
      const { shop_id, date, date_from, date_to, user_id } = req.query;
      if (!shop_id) {
        // No shop_id: return today's snapshot across all admin's shops
        const pool = require('../config/db').getPool();
        const [shops] = await pool.query(
          `SELECT DISTINCT s.id FROM shops s
           WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')`,
          [req.user.id, req.user.id]
        );
        if (shops.length === 0) return ApiResponse.success(res, []);
        const results = await Promise.all(
          shops.map(s => attendanceService.getTodayForShop(s.id).catch(() => null))
        );
        return ApiResponse.success(res, results.filter(Boolean));
      }
      const records = await attendanceService.getAttendanceForShop(parseInt(shop_id, 10), {
        date,
        dateFrom: date_from,
        dateTo:   date_to,
        userId:   user_id ? parseInt(user_id, 10) : undefined,
      });
      return ApiResponse.success(res, records);
    } catch (error) {
      logger.error('Admin get attendance error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new AttendanceController();
