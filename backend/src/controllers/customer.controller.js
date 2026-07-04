const customerService = require('../services/customer.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class CustomerController {
  // ─── List Customers ──────────────────────────────────────────────────────────
  // GET /api/customers?q=&page=&limit=&is_active=
  async getAll(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const result = customerService.getAll(businessId, req.query);
      return ApiResponse.paginated(res, result.customers, result.pagination, 'Customers retrieved successfully');
    } catch (error) {
      logger.error('Get customers error:', error.message);
      next(error);
    }
  }

  // ─── Create Customer ─────────────────────────────────────────────────────────
  // POST /api/customers
  async create(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const data = { ...req.body, user_id: req.user.id };
      const customer = customerService.create(businessId, data);
      return ApiResponse.created(res, customer, 'Customer created successfully');
    } catch (error) {
      logger.error('Create customer error:', error.message);
      next(error);
    }
  }

  // ─── Search Customers ────────────────────────────────────────────────────────
  // GET /api/customers/search?q=
  async search(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const q = req.query.q || '';
      const customers = customerService.search(businessId, q);
      return ApiResponse.success(res, customers, 'Search results retrieved');
    } catch (error) {
      logger.error('Search customers error:', error.message);
      next(error);
    }
  }

  // ─── Get Outstanding Customers ───────────────────────────────────────────────
  // GET /api/customers/outstanding
  async getOutstanding(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const customers = customerService.getOutstanding(businessId);
      return ApiResponse.success(res, customers, 'Outstanding customers retrieved');
    } catch (error) {
      logger.error('Get outstanding customers error:', error.message);
      next(error);
    }
  }

  // ─── Get Single Customer ─────────────────────────────────────────────────────
  // GET /api/customers/:id
  async getById(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const customer = customerService.getById(id, businessId);
      return ApiResponse.success(res, customer, 'Customer retrieved successfully');
    } catch (error) {
      logger.error('Get customer error:', error.message);
      next(error);
    }
  }

  // ─── Update Customer ─────────────────────────────────────────────────────────
  // PUT /api/customers/:id
  async update(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const customer = customerService.update(id, businessId, req.body);
      return ApiResponse.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      logger.error('Update customer error:', error.message);
      next(error);
    }
  }

  // ─── Delete Customer ─────────────────────────────────────────────────────────
  // DELETE /api/customers/:id
  // Soft-delete by default; pass ?hard=true for permanent removal
  async delete(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const hard = req.query.hard === 'true';
      const result = customerService.delete(id, businessId, hard);
      return ApiResponse.success(res, result, 'Customer deleted successfully');
    } catch (error) {
      logger.error('Delete customer error:', error.message);
      next(error);
    }
  }

  // ─── Get Customer Transaction History ───────────────────────────────────────
  // GET /api/customers/:id/history
  async getHistory(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const history = customerService.getHistory(id, businessId);
      return ApiResponse.success(res, history, 'Customer history retrieved successfully');
    } catch (error) {
      logger.error('Get customer history error:', error.message);
      next(error);
    }
  }
}

module.exports = new CustomerController();
