const productService = require('../services/product.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class ProductController {
  // ─── List Products ───────────────────────────────────────────────────────────
  // GET /api/products?q=&page=&limit=&category_id=&is_active=
  async getAll(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const result = productService.getAll(businessId, req.query);
      return ApiResponse.paginated(res, result.products, result.pagination, 'Products retrieved successfully');
    } catch (error) {
      logger.error('Get products error:', error.message);
      next(error);
    }
  }

  // ─── Search Products ─────────────────────────────────────────────────────────
  // GET /api/products/search?q=
  async search(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const q = req.query.q || '';
      const products = productService.search(businessId, q);
      return ApiResponse.success(res, products, 'Search results retrieved');
    } catch (error) {
      logger.error('Search products error:', error.message);
      next(error);
    }
  }

  // ─── Get Single Product ──────────────────────────────────────────────────────
  // GET /api/products/:id
  async getById(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const product = productService.getById(id, businessId);
      return ApiResponse.success(res, product, 'Product retrieved successfully');
    } catch (error) {
      logger.error('Get product error:', error.message);
      next(error);
    }
  }

  // ─── Create Product ──────────────────────────────────────────────────────────
  // POST /api/products
  async create(req, res, next) {
    try {
      const businessId = req.user.business_id;
      const userId = req.user.id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const product = productService.create(businessId, userId, req.body);
      return ApiResponse.created(res, product, 'Product created successfully');
    } catch (error) {
      logger.error('Create product error:', error.message);
      next(error);
    }
  }

  // ─── Update Product ──────────────────────────────────────────────────────────
  // PUT /api/products/:id
  async update(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const product = productService.update(id, businessId, req.body);
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      logger.error('Update product error:', error.message);
      next(error);
    }
  }

  // ─── Delete Product ──────────────────────────────────────────────────────────
  // DELETE /api/products/:id
  async delete(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const result = productService.delete(id, businessId);
      return ApiResponse.success(res, result, 'Product deleted successfully');
    } catch (error) {
      logger.error('Delete product error:', error.message);
      next(error);
    }
  }
}

module.exports = new ProductController();
