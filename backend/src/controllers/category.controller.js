const productService = require('../services/product.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class CategoryController {
  // ─── List Categories ─────────────────────────────────────────────────────────
  // GET /api/categories
  async getAll(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const categories = productService.getAllCategories(businessId);
      return ApiResponse.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      logger.error('Get categories error:', error.message);
      next(error);
    }
  }

  // ─── Create Category ─────────────────────────────────────────────────────────
  // POST /api/categories
  async create(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const { name } = req.body;
      if (!name || !name.trim()) {
        return ApiResponse.error(res, 'Category name is required', 400);
      }
      const category = productService.createCategory(businessId, name);
      return ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      logger.error('Create category error:', error.message);
      next(error);
    }
  }

  // ─── Update Category ─────────────────────────────────────────────────────────
  // PUT /api/categories/:id
  async update(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const { name } = req.body;
      if (!name || !name.trim()) {
        return ApiResponse.error(res, 'Category name is required', 400);
      }
      const category = productService.updateCategory(id, businessId, name);
      return ApiResponse.success(res, category, 'Category updated successfully');
    } catch (error) {
      logger.error('Update category error:', error.message);
      next(error);
    }
  }

  // ─── Delete Category ─────────────────────────────────────────────────────────
  // DELETE /api/categories/:id
  async delete(req, res, next) {
    try {
      const businessId = req.user.business_id;
      if (!businessId) {
        return ApiResponse.error(res, 'No business associated with this account', 400);
      }
      const id = parseInt(req.params.id, 10);
      const result = productService.deleteCategory(id, businessId);
      return ApiResponse.success(res, result, 'Category deleted successfully');
    } catch (error) {
      logger.error('Delete category error:', error.message);
      next(error);
    }
  }
}

module.exports = new CategoryController();
