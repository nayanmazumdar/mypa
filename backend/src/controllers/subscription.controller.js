const subscriptionService = require('../services/subscription.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class SubscriptionController {
  /**
   * GET /api/subscriptions/plans — list all available plans
   */
  async getPlans(req, res) {
    try {
      const plans = await subscriptionService.getPlans();
      return ApiResponse.success(res, plans, 'Plans fetched');
    } catch (error) {
      logger.error('Get plans error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/subscriptions/current — get current shop's active subscription
   */
  async getCurrentSubscription(req, res) {
    try {
      const sub = await subscriptionService.getShopSubscription(req.user.shop_id);
      return ApiResponse.success(res, sub, sub ? 'Subscription found' : 'No active subscription');
    } catch (error) {
      logger.error('Get subscription error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/subscriptions/history — get subscription history for the shop
   */
  async getHistory(req, res) {
    try {
      const history = await subscriptionService.getShopSubscriptionHistory(req.user.shop_id);
      return ApiResponse.success(res, history, 'History fetched');
    } catch (error) {
      logger.error('Get history error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * POST /api/subscriptions/subscribe — subscribe shop to a plan
   */
  async subscribe(req, res) {
    try {
      const result = await subscriptionService.subscribe(req.user.shop_id, req.body);
      return ApiResponse.created(res, result, 'Subscribed successfully');
    } catch (error) {
      logger.error('Subscribe error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * POST /api/subscriptions/cancel — cancel active subscription
   */
  async cancel(req, res) {
    try {
      const result = await subscriptionService.cancel(req.user.shop_id);
      return ApiResponse.success(res, result, 'Subscription cancelled');
    } catch (error) {
      logger.error('Cancel subscription error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/subscriptions/limits — check current usage against plan limits
   */
  async getLimits(req, res) {
    try {
      const limits = await subscriptionService.checkLimits(req.user.shop_id);
      return ApiResponse.success(res, limits, 'Limits fetched');
    } catch (error) {
      logger.error('Get limits error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * GET /api/subscriptions/check-feature/:feature — check if a feature is available
   */
  async checkFeature(req, res) {
    try {
      const hasFeature = await subscriptionService.checkFeature(req.user.shop_id, req.params.feature);
      return ApiResponse.success(res, { feature: req.params.feature, available: hasFeature });
    } catch (error) {
      logger.error('Check feature error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new SubscriptionController();
