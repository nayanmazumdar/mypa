const authService = require('../services/auth.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, result, 'Registration successful');
    } catch (error) {
      logger.error('Register error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      return ApiResponse.success(res, user);
    } catch (error) {
      logger.error('Get profile error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new AuthController();
