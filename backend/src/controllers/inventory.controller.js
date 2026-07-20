const inventoryService = require('../services/inventory.service');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class InventoryController {
  async getAll(req, res) {
    try {
      const { limit, offset } = parsePagination(req.query);
      const result = await inventoryService.getAllStock(req.user.shop_id, { limit, offset, search: req.query.search });
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
      if (!product_id) return ApiResponse.error(res, 'product_id is required', 400);
      if (!quantity || quantity <= 0) return ApiResponse.error(res, 'Valid quantity is required', 400);
      if (!type || !['in', 'out', 'adjustment'].includes(type)) return ApiResponse.error(res, 'Invalid stock type', 400);
      await inventoryService.addStock(req.user.shop_id, req.user.id, product_id, quantity, type, 'manual', null, notes);
      return ApiResponse.success(res, null, 'Stock updated successfully');
    } catch (error) {
      logger.error('Add stock error:', error.message || error.original?.message || error);
      return ApiResponse.error(res, error.message || 'Failed to update stock', error.statusCode || 500);
    }
  }

  async getHistory(req, res) {
    try {
      const history = await inventoryService.getStockHistory(req.user.shop_id, req.params.productId);
      return ApiResponse.success(res, history);
    } catch (error) {
      logger.error('Get stock history error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateSettings(req, res) {
    try {
      const { min_stock_level, max_stock_level, location } = req.body;
      await inventoryService.updateSettings(req.user.shop_id, req.params.productId, { min_stock_level, max_stock_level, location });
      return ApiResponse.success(res, null, 'Inventory settings updated');
    } catch (error) {
      logger.error('Update inventory settings error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateLevels(req, res) {
    try {
      const { product_id, min_stock_level, max_stock_level, location } = req.body;
      if (!product_id) return ApiResponse.error(res, 'product_id is required', 400);
      await inventoryService.updateSettings(req.user.shop_id, product_id, { min_stock_level, max_stock_level, location });
      return ApiResponse.success(res, null, 'Stock levels updated');
    } catch (error) {
      logger.error('Update levels error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new InventoryController();
