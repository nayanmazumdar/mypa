const authService = require('../services/auth.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class AuthController {
  // ─── Register ────────────────────────────────────────────────────────────────
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, result, 'Registration successful');
    } catch (error) {
      logger.error('Register error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────
  async refresh(req, res) {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      return ApiResponse.success(res, result, 'Token refreshed');
    } catch (error) {
      logger.error('Refresh token error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  async logout(req, res) {
    try {
      const result = await authService.logout(req.user.id, req.body.refreshToken);
      return ApiResponse.success(res, result, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(req, res) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      logger.error('Forgot password error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────
  async verifyOtp(req, res) {
    try {
      const result = await authService.verifyOtp(req.body.email, req.body.otp);
      return ApiResponse.success(res, result, 'OTP verified');
    } catch (error) {
      logger.error('Verify OTP error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(req, res) {
    try {
      const result = await authService.resetPassword(
        req.body.email,
        req.body.otp,
        req.body.password
      );
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      logger.error('Reset password error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Get Profile ─────────────────────────────────────────────────────────────
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

  // ─── Update Profile ──────────────────────────────────────────────────────────
  async updateProfile(req, res) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      return ApiResponse.success(res, user, 'Profile updated');
    } catch (error) {
      logger.error('Update profile error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new AuthController();
