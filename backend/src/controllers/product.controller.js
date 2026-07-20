const productService = require('../services/product.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class ProductController {
  async getAll(req, res) {
    try {
      const result = await productService.getAll(req.user.shop_id, req.query);
      return ApiResponse.paginated(res, result.products, result.pagination);
    } catch (error) {
      logger.error('Get products error:', error);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getById(req, res) {
    try {
      const product = await productService.getById(req.params.id, req.user.shop_id);
      return ApiResponse.success(res, product);
    } catch (error) {
      logger.error('Get product error:', error);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async create(req, res) {
    try {
      const product = await productService.create(req.user.shop_id, req.body, req.user.id);
      return ApiResponse.created(res, product, 'Product created successfully');
    } catch (error) {
      logger.error('Create product error:', error);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async update(req, res) {
    try {
      const product = await productService.update(req.params.id, req.user.shop_id, req.body);
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      logger.error('Update product error:', error);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async delete(req, res) {
    try {
      await productService.delete(req.params.id, req.user.shop_id);
      return ApiResponse.success(res, null, 'Product deleted successfully');
    } catch (error) {
      logger.error('Delete product error:', error);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new ProductController();
