const { getPool } = require('../config/db');
const logger = require('../config/logger');

class SubscriptionService {
  /**
   * Get all active subscription plans
   */
  async getPlans() {
    const pool = getPool();
    const [plans] = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    // Parse features JSON for each plan
    return plans.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
  }

  /**
   * Get a single plan by ID
   */
  async getPlanById(planId) {
    const pool = getPool();
    const [[plan]] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (!plan) {
      const e = new Error('Plan not found'); e.statusCode = 404; throw e;
    }
    plan.features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    return plan;
  }

  /**
   * Get the current active subscription for a shop
   */
  async getShopSubscription(shopId) {
    const pool = getPool();
    const [[sub]] = await pool.query(
      `SELECT ss.*, sp.name AS plan_name, sp.display_name AS plan_display_name,
              sp.max_products, sp.max_staff, sp.max_customers, sp.max_monthly_sales,
              sp.features AS plan_features
       FROM shop_subscriptions ss
       JOIN subscription_plans sp ON ss.plan_id = sp.id
       WHERE ss.shop_id = ? AND ss.status IN ('active', 'trial')
       ORDER BY ss.expires_at DESC LIMIT 1`,
      [shopId]
    );
    if (!sub) return null;
    sub.plan_features = typeof sub.plan_features === 'string'
      ? JSON.parse(sub.plan_features) : sub.plan_features;
    return sub;
  }

  /**
   * Get subscription history for a shop
   */
  async getShopSubscriptionHistory(shopId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ss.*, sp.name AS plan_name, sp.display_name AS plan_display_name
       FROM shop_subscriptions ss
       JOIN subscription_plans sp ON ss.plan_id = sp.id
       WHERE ss.shop_id = ?
       ORDER BY ss.created_at DESC`,
      [shopId]
    );
    return rows;
  }

  /**
   * Subscribe a shop to a plan (or upgrade/downgrade)
   */
  async subscribe(shopId, { plan_id, billing_cycle, payment_reference }) {
    if (!shopId) {
      const e = new Error('No shop selected. Please select a shop first.');
      e.statusCode = 400;
      throw e;
    }
    const pool = getPool();

    // Validate plan exists and is active
    const [[plan]] = await pool.query(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [plan_id]
    );
    if (!plan) {
      const e = new Error('Invalid or inactive plan'); e.statusCode = 400; throw e;
    }

    // Determine price based on billing cycle
    const cycle = billing_cycle || 'monthly';
    let amount = 0;
    let durationMonths = 1;
    switch (cycle) {
      case 'monthly':
        amount = parseFloat(plan.price_monthly);
        durationMonths = 1;
        break;
      case 'quarterly':
        amount = parseFloat(plan.price_quarterly);
        durationMonths = 3;
        break;
      case 'yearly':
        amount = parseFloat(plan.price_yearly);
        durationMonths = 12;
        break;
      default: {
        const e = new Error('Invalid billing cycle'); e.statusCode = 400; throw e;
      }
    }

    // Expire any current active subscription
    await pool.query(
      `UPDATE shop_subscriptions SET status = 'expired' 
       WHERE shop_id = ? AND status IN ('active', 'trial')`,
      [shopId]
    );

    // Calculate dates
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const status = amount === 0 ? 'trial' : 'active';

    const [result] = await pool.query(
      `INSERT INTO shop_subscriptions 
       (shop_id, plan_id, billing_cycle, status, amount_paid, currency, starts_at, expires_at, payment_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shopId, plan_id, cycle, status, amount, plan.currency || 'INR', startsAt, expiresAt, payment_reference || null]
    );

    logger.info(`Shop ${shopId} subscribed to plan ${plan.name} (${cycle})`);

    return {
      id: result.insertId,
      shop_id: shopId,
      plan_id,
      plan_name: plan.name,
      plan_display_name: plan.display_name,
      billing_cycle: cycle,
      status,
      amount_paid: amount,
      starts_at: startsAt,
      expires_at: expiresAt,
    };
  }

  /**
   * Cancel a shop's active subscription
   */
  async cancel(shopId) {
    if (!shopId) {
      const e = new Error('No shop selected. Please select a shop first.');
      e.statusCode = 400;
      throw e;
    }
    const pool = getPool();
    const [[sub]] = await pool.query(
      `SELECT id FROM shop_subscriptions WHERE shop_id = ? AND status IN ('active', 'trial') ORDER BY expires_at DESC LIMIT 1`,
      [shopId]
    );
    if (!sub) {
      const e = new Error('No active subscription found'); e.statusCode = 404; throw e;
    }

    await pool.query(
      `UPDATE shop_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`,
      [sub.id]
    );

    logger.info(`Shop ${shopId} cancelled subscription ${sub.id}`);
    return { message: 'Subscription cancelled' };
  }

  /**
   * Check if a shop has access to a specific feature
   */
  async checkFeature(shopId, featureKey) {
    const sub = await this.getShopSubscription(shopId);
    if (!sub) return false;
    if (!sub.plan_features) return false;
    return !!sub.plan_features[featureKey];
  }

  /**
   * Check if a shop is within its plan limits
   */
  async checkLimits(shopId) {
    const pool = getPool();
    const sub = await this.getShopSubscription(shopId);
    if (!sub) {
      return { has_subscription: false, limits: null };
    }

    // Get current counts
    const [[{ product_count }]] = await pool.query(
      'SELECT COUNT(*) AS product_count FROM products WHERE shop_id = ?', [shopId]
    );
    const [[{ staff_count }]] = await pool.query(
      'SELECT COUNT(*) AS staff_count FROM user_shops WHERE shop_id = ? AND is_active = 1', [shopId]
    );
    const [[{ customer_count }]] = await pool.query(
      'SELECT COUNT(*) AS customer_count FROM customers WHERE shop_id = ?', [shopId]
    );

    // Monthly sales count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [[{ sales_count }]] = await pool.query(
      'SELECT COUNT(*) AS sales_count FROM sales WHERE shop_id = ? AND created_at >= ?',
      [shopId, startOfMonth]
    );

    return {
      has_subscription: true,
      plan_name: sub.plan_name,
      plan_display_name: sub.plan_display_name,
      status: sub.status,
      expires_at: sub.expires_at,
      limits: {
        products: { used: product_count, max: sub.max_products, unlimited: sub.max_products === null },
        staff: { used: staff_count, max: sub.max_staff, unlimited: sub.max_staff === null },
        customers: { used: customer_count, max: sub.max_customers, unlimited: sub.max_customers === null },
        monthly_sales: { used: sales_count, max: sub.max_monthly_sales, unlimited: sub.max_monthly_sales === null },
      },
      features: sub.plan_features,
    };
  }
}

module.exports = new SubscriptionService();
