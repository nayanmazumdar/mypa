const purchaseService = require('../services/purchase.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class PurchaseController {
  async getAll(req, res) {
    try {
      const result = await purchaseService.getAll(req.user.id, req.query);
      return ApiResponse.paginated(res, result.purchases, result.pagination);
    } catch (error) {
      logger.error('Get purchases error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getById(req, res) {
    try {
      const purchase = await purchaseService.getById(req.params.id, req.user.id);
      return ApiResponse.success(res, purchase);
    } catch (error) {
      logger.error('Get purchase error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async create(req, res) {
    try {
      const purchase = await purchaseService.create(req.user.id, req.body);
      return ApiResponse.created(res, purchase, 'Purchase created successfully');
    } catch (error) {
      logger.error('Create purchase error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateStatus(req, res) {
    try {
      const purchase = await purchaseService.updateStatus(req.params.id, req.user.id, req.body.status);
      return ApiResponse.success(res, purchase, 'Purchase status updated');
    } catch (error) {
      logger.error('Update purchase status error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new PurchaseController();
