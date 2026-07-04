const inventoryService = require('../services/inventory.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class InventoryController {
  /**
   * GET /api/inventory
   * List inventory items for the authenticated user's business.
   * Supports ?low_stock=true and standard pagination (?page=&limit=).
   */
  getAll(req, res) {
    try {
      const businessId = req.user.business_id;
      const result = inventoryService.getAll(businessId, req.query);
      return ApiResponse.paginated(res, result.items, result.pagination, 'Inventory retrieved successfully');
    } catch (error) {
      logger.error('Get inventory error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * POST /api/inventory/adjust
   * Manual stock adjustment.
   * Body: { productId, quantity (can be negative), reason, type? }
   */
  adjust(req, res) {
    try {
      const businessId = req.user.business_id;
      const result = inventoryService.adjust(businessId, req.body);
      return ApiResponse.success(res, result, 'Stock adjusted successfully');
    } catch (error) {
      logger.error('Stock adjustment error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/inventory/movements
   * List stock movements for the authenticated user's business.
   * Supports ?productId= and standard pagination.
   */
  getMovements(req, res) {
    try {
      const businessId = req.user.business_id;
      const result = inventoryService.getMovements(businessId, req.query);
      return ApiResponse.paginated(res, result.movements, result.pagination, 'Stock movements retrieved successfully');
    } catch (error) {
      logger.error('Get stock movements error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new InventoryController();
