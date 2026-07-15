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

  async selectShop(req, res) {
    try {
      const result = await authService.selectShop(req.user.id, req.body.shop_id);
      return ApiResponse.success(res, result, 'Shop selected');
    } catch (error) {
      logger.error('Select shop error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async setupShop(req, res) {
    try {
      const result = await authService.createShop(req.user.id, req.body);
      return ApiResponse.created(res, result, 'Shop created successfully');
    } catch (error) {
      logger.error('Setup shop error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async setPasscode(req, res) {
    try {
      await authService.setPasscode(req.user.id, req.body);
      return ApiResponse.success(res, null, 'Passcode set successfully');
    } catch (error) {
      logger.error('Set passcode error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      if (!user) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.success(res, user);
    } catch (error) {
      logger.error('Get profile error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async getStaff(req, res) {
    try {
      const staff = await authService.getShopStaff(req.user.shop_id);
      return ApiResponse.success(res, staff);
    } catch (error) {
      logger.error('Get staff error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async addStaff(req, res) {
    try {
      const result = await authService.addStaff({ ...req.body, shop_id: req.user.shop_id });
      return ApiResponse.created(res, result, 'Staff member added');
    } catch (error) {
      logger.error('Add staff error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateProfile(req, res) {
    try {
      // If a file was uploaded, build the relative URL for the avatar
      const avatarPath = req.file ? `/uploads/${req.file.filename}` : undefined;
      await authService.updateProfile(req.user.id, {
        name: req.body.name,
        phone: req.body.phone,
        area: req.body.area,
        pincode: req.body.pincode,
        ...(avatarPath !== undefined && { avatar: avatarPath }),
      });
      // Return updated profile so the client can refresh state
      const updated = await authService.getProfile(req.user.id);
      return ApiResponse.success(res, updated, 'Profile updated');
    } catch (error) {
      logger.error('Update profile error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateShop(req, res) {
    try {
      await authService.updateShop(req.user.shop_id, req.body);
      return ApiResponse.success(res, null, 'Shop updated');
    } catch (error) {
      logger.error('Update shop error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async changePassword(req, res) {
    try {
      await authService.changePassword(req.user.id, req.body);
      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async chooseRole(req, res) {
    try {
      const result = await authService.chooseRole(req.user.id, req.body.role, req.body.default_module);
      return ApiResponse.success(res, result, 'Role assigned successfully');
    } catch (error) {
      logger.error('Choose role error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new AuthController();
