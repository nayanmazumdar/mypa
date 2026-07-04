const salesService = require('../services/sales.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class SalesController {
  async getAll(req, res) {
    try {
      const result = await salesService.getAll(req.user.shop_id, req.query);
      return ApiResponse.paginated(res, result.sales, result.pagination);
    } catch (error) {
      logger.error('Get sales error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getById(req, res) {
    try {
      const sale = await salesService.getById(req.params.id, req.user.shop_id);
      return ApiResponse.success(res, sale);
    } catch (error) {
      logger.error('Get sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async create(req, res) {
    try {
      const sale = await salesService.create(req.user.shop_id, req.body);
      return ApiResponse.created(res, sale, 'Sale created successfully');
    } catch (error) {
      logger.error('Create sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateStatus(req, res) {
    try {
      const sale = await salesService.updateStatus(req.params.id, req.user.shop_id, req.body.status);
      return ApiResponse.success(res, sale, 'Sale status updated');
    } catch (error) {
      logger.error('Update sale status error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new SalesController();
