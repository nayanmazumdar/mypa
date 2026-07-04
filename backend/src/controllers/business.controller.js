const businessService = require('../services/business.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class BusinessController {
  // ─── List Businesses ─────────────────────────────────────────────────────────
  // GET /api/business
  // admin / super_admin → all businesses; business_owner → own business only
  async getAll(req, res, next) {
    try {
      const { id: userId, role } = req.user;
      const result = await businessService.getAll(userId, role, req.query);
      return ApiResponse.paginated(res, result.businesses, result.pagination, 'Businesses retrieved successfully');
    } catch (error) {
      logger.error('Get businesses error:', error.message);
      next(error);
    }
  }

  // ─── Create Business ─────────────────────────────────────────────────────────
  // POST /api/business
  // BUSINESS_OWNER only — creates a business linked to req.user.id
  async create(req, res, next) {
    try {
      const business = await businessService.create(req.user.id, req.body);
      return ApiResponse.created(res, business, 'Business created successfully');
    } catch (error) {
      logger.error('Create business error:', error.message);
      next(error);
    }
  }

  // ─── Get Business Dashboard ──────────────────────────────────────────────────
  // GET /api/business/dashboard
  // Returns today's sales, collections, outstanding, customer count, subscription status
  async getDashboard(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const data = await businessService.getDashboard(businessId);
      return ApiResponse.success(res, data, 'Dashboard data retrieved successfully');
    } catch (error) {
      logger.error('Get dashboard error:', error.message);
      next(error);
    }
  }

  // ─── Get Business Statistics ─────────────────────────────────────────────────
  // GET /api/business/statistics
  // Returns monthly sales chart array and top 5 customers
  async getStatistics(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const data = await businessService.getStatistics(businessId);
      return ApiResponse.success(res, data, 'Statistics retrieved successfully');
    } catch (error) {
      logger.error('Get statistics error:', error.message);
      next(error);
    }
  }

  // ─── Update Business ─────────────────────────────────────────────────────────
  // PUT /api/business/:id
  // business_owner can update their own business; admin/super_admin can update any
  async update(req, res, next) {
    try {
      const { role, business_id: userBusinessId } = req.user;
      const targetId = parseInt(req.params.id, 10);
      const isAdmin = ['admin', 'super_admin'].includes(role);

      // Non-admin can only update their own business
      if (!isAdmin && userBusinessId !== targetId) {
        return ApiResponse.forbidden(res, 'You do not have permission to update this business');
      }

      const business = await businessService.update(targetId, req.body);
      return ApiResponse.success(res, business, 'Business updated successfully');
    } catch (error) {
      logger.error('Update business error:', error.message);
      next(error);
    }
  }

  // ─── Delete Business ─────────────────────────────────────────────────────────
  // DELETE /api/business/:id
  // admin / super_admin only
  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      await businessService.delete(id);
      return ApiResponse.success(res, null, 'Business deleted successfully');
    } catch (error) {
      logger.error('Delete business error:', error.message);
      next(error);
    }
  }

  // ─── Approve Business ────────────────────────────────────────────────────────
  // POST /api/admin/approve-business
  // Sets is_active = 1; admin / super_admin only
  async approveBusiness(req, res, next) {
    try {
      const { businessId } = req.body;
      if (!businessId) {
        return ApiResponse.error(res, 'businessId is required', 400);
      }
      const business = await businessService.setActive(businessId, true);
      return ApiResponse.success(res, business, 'Business approved successfully');
    } catch (error) {
      logger.error('Approve business error:', error.message);
      next(error);
    }
  }

  // ─── Block Business ──────────────────────────────────────────────────────────
  // POST /api/admin/block-business
  // Sets is_active = 0; admin / super_admin only
  async blockBusiness(req, res, next) {
    try {
      const { businessId } = req.body;
      if (!businessId) {
        return ApiResponse.error(res, 'businessId is required', 400);
      }
      const business = await businessService.setActive(businessId, false);
      return ApiResponse.success(res, business, 'Business blocked successfully');
    } catch (error) {
      logger.error('Block business error:', error.message);
      next(error);
    }
  }
}

module.exports = new BusinessController();
