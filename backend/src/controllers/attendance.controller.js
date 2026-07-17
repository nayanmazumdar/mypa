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
}

module.exports = new AttendanceController();
