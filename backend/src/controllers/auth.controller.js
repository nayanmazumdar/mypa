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
      logger.error('Login error:', { message: error.message, stack: error.stack, statusCode: error.statusCode });
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
      return ApiResponse.created(res, result, result.existing_account
        ? `${result.name} already has an account and has been added to your shop`
        : 'Staff member added');
    } catch (error) {
      logger.error('Add staff error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async toggleShopStatus(req, res) {
    try {
      const result = await authService.toggleShopStatus(req.user.shop_id);
      const msg = result.is_open
        ? `Shop is now Open — ${result.staff_updated} staff member(s) enabled`
        : `Shop is now Closed — ${result.staff_updated} staff member(s) disabled`;
      return ApiResponse.success(res, result, msg);
    } catch (error) {
      logger.error('Toggle shop status error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async removeStaff(req, res) {
    try {
      await authService.removeStaff(req.user.shop_id, parseInt(req.params.userId, 10));
      return ApiResponse.success(res, null, 'Staff member removed from shop');
    } catch (error) {
      logger.error('Remove staff error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async checkEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return ApiResponse.error(res, 'Email is required', 400);
      const pool = require('../config/db').getPool();
      const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (rows.length > 0) {
        return ApiResponse.success(res, { exists: true, name: rows[0].name }, 'Account found');
      }
      return ApiResponse.success(res, { exists: false }, 'No account found');
    } catch (error) {
      logger.error('Check email error:', error.message);
      return ApiResponse.error(res, error.message, 500);
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

  async refreshToken(req, res) {
    try {
      const result = await authService.refreshToken(req.body.refresh_token);
      return ApiResponse.success(res, result, 'Token refreshed');
    } catch (error) {
      logger.error('Refresh token error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 401);
    }
  }
}

module.exports = new AuthController();
