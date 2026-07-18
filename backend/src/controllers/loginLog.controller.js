const loginLogService = require('../services/loginLog.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class LoginLogController {
  async getLogs(req, res) {
    try {
      const { date, shop_id } = req.query;
      const shopId = shop_id || req.user.shop_id;
      if (!shopId) {
        // No specific shop — get logs across all admin's shops
        const data = await loginLogService.getLogsForAdmin(req.user.id, date);
        return ApiResponse.success(res, data);
      }
      const data = await loginLogService.getLogs(shopId, date);
      return ApiResponse.success(res, data);
    } catch (error) {
      logger.error('Get login logs error:', error.message);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async logout(req, res) {
    try {
      const { log_id } = req.body;
      if (!log_id) {
        return ApiResponse.error(res, 'log_id is required', 400);
      }
      await loginLogService.recordLogout(log_id, req.user.id);
      return ApiResponse.success(res, null, 'Logout recorded');
    } catch (error) {
      logger.error('Record logout error:', error.message);
      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new LoginLogController();
