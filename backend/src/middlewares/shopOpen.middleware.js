const { getPool } = require('../config/db');

/**
 * Middleware that blocks POS/sales operations when the shop is closed.
 * Admins are exempt — they can always operate regardless of shop status.
 *
 * Must be used AFTER the `authenticate` middleware (requires req.user).
 */
const requireShopOpen = async (req, res, next) => {
  try {
    // Admins bypass the shop-open check
    if (req.user.role === 'admin') {
      return next();
    }

    const shopId = req.user.shop_id;
    if (!shopId) {
      return res.status(403).json({
        success: false,
        code: 'NO_SHOP',
        message: 'No shop selected',
        action: 'select_shop',
      });
    }

    const pool = getPool();
    const [[shop]] = await pool.query(
      'SELECT is_open FROM shops WHERE id = ?',
      [shopId]
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        code: 'SHOP_NOT_FOUND',
        message: 'Shop not found',
        action: 'select_shop',
      });
    }

    if (!shop.is_open) {
      return res.status(403).json({
        success: false,
        code: 'SHOP_CLOSED',
        message: 'This shop is currently closed. POS operations are disabled.',
        action: 'shop_closed',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireShopOpen };
