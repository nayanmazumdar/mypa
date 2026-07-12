const inventoryService = require('../services/inventory.service');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class InventoryController {
  async getAll(req, res) {
    try {
      const { limit, offset } = parsePagination(req.query);
      const result = await inventoryService.getAllStock(req.user.shop_id, { limit, offset });
      const pagination = buildPaginationMeta(result.total, parseInt(req.query.page) || 1, limit);
      return ApiResponse.paginated(res, result.items, pagination);
    } catch (error) {
      logger.error('Get inventory error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getLowStock(req, res) {
    try {
      const items = await inventoryService.getLowStock(req.user.shop_id);
      return ApiResponse.success(res, items);
    } catch (error) {
      logger.error('Get low stock error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async addStock(req, res) {
    try {
      const { product_id, quantity, type, notes } = req.body;
      if (!product_id || quantity === undefined || !type) {
        return ApiResponse.error(res, 'product_id, quantity, and type are required', 400);
      }
      if (!['in', 'out', 'adjustment'].includes(type)) {
        return ApiResponse.error(res, 'type must be one of: in, out, adjustment', 400);
      }
      if (parseFloat(quantity) < 0) {
        return ApiResponse.error(res, 'quantity must be a positive number', 400);
      }
      const result = await inventoryService.addStock(
        req.user.shop_id, product_id, quantity, type, 'manual', null, notes
      );
      return ApiResponse.success(res, result, 'Stock updated successfully');
    } catch (error) {
      logger.error('Add stock error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateLevels(req, res) {
    try {
      const { product_id, min_stock_level, max_stock_level, location } = req.body;
      if (!product_id) return ApiResponse.error(res, 'product_id is required', 400);
      await inventoryService.updateStockLevels(
        req.user.shop_id, product_id, { min_stock_level, max_stock_level, location }
      );
      return ApiResponse.success(res, null, 'Stock levels updated');
    } catch (error) {
      logger.error('Update levels error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new InventoryController();
