const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, permit } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all inventory
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of inventory items }
 */
router.get('/', authenticate, permit('inventory:read'), inventoryController.getAll);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: Get low stock items
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Low stock items }
 */
router.get('/low-stock', authenticate, permit('inventory:read'), inventoryController.getLowStock);

/**
 * @swagger
 * /api/inventory/add:
 *   post:
 *     tags: [Inventory]
 *     summary: Manually add or remove stock
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, quantity, type]
 *             properties:
 *               product_id: { type: integer }
 *               quantity: { type: number }
 *               type: { type: string, enum: [in, out, adjustment] }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Stock updated }
 */
router.post('/add', authenticate, permit('inventory:adjust'), inventoryController.addStock);

/**
 * @swagger
 * /api/inventory/{productId}/history:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock movement history for a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Stock movement history }
 */
router.get('/:productId/history', authenticate, permit('inventory:read'), inventoryController.getHistory);

/**
 * @swagger
 * /api/inventory/{productId}/settings:
 *   put:
 *     tags: [Inventory]
 *     summary: Update min/max stock levels and location
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               min_stock_level: { type: number }
 *               max_stock_level: { type: number }
 *               location: { type: string }
 *     responses:
 *       200: { description: Settings updated }
 */
router.put('/:productId/settings', authenticate, permit('inventory:adjust'), inventoryController.updateSettings);

/**
 * @swagger
 * /api/inventory/levels:
 *   put:
 *     tags: [Inventory]
 *     summary: Update min/max stock levels
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id]
 *             properties:
 *               product_id: { type: integer }
 *               min_stock_level: { type: number }
 *               max_stock_level: { type: number }
 *               location: { type: string }
 *     responses:
 *       200: { description: Levels updated }
 */
router.put('/levels', authenticate, inventoryController.updateLevels);

/**
 * @swagger
 * /api/inventory/report:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock report — value, status breakdown, category summary, recent movements
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stock report data }
 */
router.get('/report', authenticate, async (req, res, next) => {
  try {
    const { getPool } = require('../config/db');
    const pool = getPool();
    const shopId = req.user.shop_id;

    // ── 1. Per-product stock snapshot ─────────────────────────────────────
    const [items] = await pool.query(
      `SELECT
         p.id              AS product_id,
         p.name            AS product_name,
         p.sku,
         p.unit,
         c.name            AS category_name,
         p.purchase_price,
         p.selling_price,
         COALESCE(i.quantity, 0)        AS quantity,
         COALESCE(i.min_stock_level, 0) AS min_stock_level,
         COALESCE(i.max_stock_level, 0) AS max_stock_level
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON i.product_id = p.id AND i.shop_id = ?
       WHERE p.shop_id = ? AND p.is_active = 1
       ORDER BY p.name ASC`,
      [shopId, shopId]
    );

    // ── 2. Stock value totals ─────────────────────────────────────────────
    let totalCostValue = 0, totalSaleValue = 0;
    let inStockCount = 0, lowStockCount = 0, outOfStockCount = 0;
    const categoryMap = {};

    for (const item of items) {
      const qty   = parseFloat(item.quantity);
      const cost  = parseFloat(item.purchase_price) || 0;
      const sale  = parseFloat(item.selling_price)  || 0;
      const min   = parseFloat(item.min_stock_level) || 0;

      totalCostValue += qty * cost;
      totalSaleValue += qty * sale;

      if (qty <= 0)       outOfStockCount++;
      else if (qty <= min) lowStockCount++;
      else                 inStockCount++;

      // Category rollup
      const cat = item.category_name || 'Uncategorised';
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, products: 0, cost_value: 0, sale_value: 0 };
      categoryMap[cat].products++;
      categoryMap[cat].cost_value  += qty * cost;
      categoryMap[cat].sale_value  += qty * sale;
    }

    // ── 3. Recent stock movements (last 30 days) ──────────────────────────
    const [movements] = await pool.query(
      `SELECT
         sm.type, sm.quantity, sm.notes, sm.created_at,
         p.name AS product_name, p.sku
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       WHERE sm.shop_id = ?
         AND sm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY sm.created_at DESC
       LIMIT 50`,
      [shopId]
    );

    // ── 4. Movement summary (last 30 days) ────────────────────────────────
    const [[movSummary]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'in'         THEN quantity ELSE 0 END), 0) AS total_in,
         COALESCE(SUM(CASE WHEN type = 'out'        THEN quantity ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN type = 'adjustment' THEN 1        ELSE 0 END), 0) AS total_adjustments,
         COUNT(*) AS total_movements
       FROM stock_movements
       WHERE shop_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [shopId]
    );

    return res.json({
      success: true,
      data: {
        summary: {
          total_products:   items.length,
          in_stock:         inStockCount,
          low_stock:        lowStockCount,
          out_of_stock:     outOfStockCount,
          total_cost_value: Math.round(totalCostValue  * 100) / 100,
          total_sale_value: Math.round(totalSaleValue  * 100) / 100,
          potential_profit: Math.round((totalSaleValue - totalCostValue) * 100) / 100,
        },
        by_category:    Object.values(categoryMap).sort((a, b) => b.sale_value - a.sale_value),
        items,
        movement_summary: movSummary,
        recent_movements: movements,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
