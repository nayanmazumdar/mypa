const subscriptionService = require('../services/subscription.service');

/**
 * Middleware to check if the shop has an active subscription.
 * Use on routes that should be gated behind any paid plan.
 */
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.shop_id) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
    }
    const sub = await subscriptionService.getShopSubscription(req.user.shop_id);
    if (!sub) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to access this feature',
        action: 'subscribe',
      });
    }
    // Check if subscription is expired
    if (new Date(sub.expires_at) < new Date()) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please renew.',
        action: 'subscribe',
      });
    }
    // Attach subscription info to request for downstream use
    req.subscription = sub;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Subscription check failed' });
  }
};

/**
 * Middleware factory to check if a specific feature is available on the shop's current plan.
 * Usage: requireFeature('reports')
 */
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.shop_id) {
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const hasFeature = await subscriptionService.checkFeature(req.user.shop_id, featureKey);
      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Your current plan does not include the "${featureKey}" feature. Please upgrade.`,
          action: 'upgrade',
          feature: featureKey,
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Feature check failed' });
    }
  };
};

/**
 * Middleware factory to check plan limits before allowing resource creation.
 * Usage: requireLimit('products')
 */
const requireLimit = (resource) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.shop_id) {
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const result = await subscriptionService.checkLimits(req.user.shop_id);
      if (!result.has_subscription) {
        // No subscription = allow (free tier fallback, or you can deny)
        return next();
      }
      const limit = result.limits[resource];
      if (!limit || limit.unlimited) {
        return next();
      }
      if (limit.used >= limit.max) {
        return res.status(403).json({
          success: false,
          code: 'LIMIT_REACHED',
          message: `You've reached the maximum ${resource} limit (${limit.max}) for your plan. Please upgrade.`,
          action: 'upgrade',
          resource,
          current: limit.used,
          max: limit.max,
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Limit check failed' });
    }
  };
};

module.exports = { requireSubscription, requireFeature, requireLimit };
