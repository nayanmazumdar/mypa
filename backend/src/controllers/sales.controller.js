const salesService = require('../services/sales.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class SalesController {
  /**
   * POST /api/sales
   * Create a new sale (with line items, stock decrement, optional credit transaction).
   */
  async create(req, res) {
    try {
      const businessId = req.user.business_id;
      const userId     = req.user.id;
      const sale = salesService.create(businessId, userId, req.body);
      return ApiResponse.created(res, sale, 'Sale created successfully');
    } catch (error) {
      logger.error('Create sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/sales
   * List sales for the authenticated business with optional filters + pagination.
   */
  async getAll(req, res) {
    try {
      const businessId = req.user.business_id;
      const result = salesService.getAll(businessId, req.query);
      return ApiResponse.paginated(res, result.sales, result.pagination);
    } catch (error) {
      logger.error('Get sales error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/sales/today
   * Today's sales summary and list.
   */
  async getToday(req, res) {
    try {
      const businessId = req.user.business_id;
      const data = salesService.getToday(businessId);
      return ApiResponse.success(res, data, "Today's sales");
    } catch (error) {
      logger.error('Get today sales error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/sales/monthly
   * Monthly sales totals grouped by day. Accepts ?year=&month= query params.
   */
  async getMonthly(req, res) {
    try {
      const businessId = req.user.business_id;
      const data = salesService.getMonthly(businessId, req.query);
      return ApiResponse.success(res, data, 'Monthly sales');
    } catch (error) {
      logger.error('Get monthly sales error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/sales/:id
   * Get a single sale with its line items.
   */
  async getById(req, res) {
    try {
      const businessId = req.user.business_id;
      const sale = salesService.getById(req.params.id, businessId);
      return ApiResponse.success(res, sale);
    } catch (error) {
      logger.error('Get sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * PUT /api/sales/:id
   * Update sale status or notes.
   */
  async update(req, res) {
    try {
      const businessId = req.user.business_id;
      const sale = salesService.update(req.params.id, businessId, req.body);
      return ApiResponse.success(res, sale, 'Sale updated successfully');
    } catch (error) {
      logger.error('Update sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * DELETE /api/sales/:id
   * Delete a sale and its line items.
   */
  async delete(req, res) {
    try {
      const businessId = req.user.business_id;
      salesService.delete(req.params.id, businessId);
      return ApiResponse.success(res, null, 'Sale deleted successfully');
    } catch (error) {
      logger.error('Delete sale error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/sales/customer/:id
   * All sales for a specific customer within the authenticated business.
   */
  async getByCustomer(req, res) {
    try {
      const businessId = req.user.business_id;
      const sales = salesService.getByCustomer(req.params.id, businessId);
      return ApiResponse.success(res, sales);
    } catch (error) {
      logger.error('Get sales by customer error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new SalesController();
