const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { Sale, SaleItem, Product, Customer, Inventory } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Get dashboard overview stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats (today sales, products, customers, low stock) }
 */
router.get('/dashboard', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const shopId = req.user.shop_id;
    const today = new Date().toISOString().split('T')[0];

    const [todaySales, totalProducts, totalCustomers, lowStock] = await Promise.all([
      Sale.findOne({
        attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'revenue']],
        where: { shop_id: shopId, sale_date: today, status: 'completed' },
        raw: true,
      }),
      Product.count({ where: { shop_id: shopId, is_active: true } }),
      Customer.count({ where: { shop_id: shopId, is_active: true } }),
      Inventory.count({ where: { shop_id: shopId, quantity: { [Op.lte]: col('Inventory.min_stock_level') } } }),
    ]);

    return ApiResponse.success(res, {
      today_sales: todaySales,
      total_products: totalProducts,
      total_customers: totalCustomers,
      low_stock_items: lowStock,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/daily-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get daily sales report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Date for report (defaults to today)
 *     responses:
 *       200: { description: Daily sales totals }
 */
router.get('/daily-sales', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await Sale.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_sales'],
        [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'total_revenue'],
        [fn('COALESCE', fn('SUM', col('discount')), 0), 'total_discount'],
      ],
      where: { shop_id: req.user.shop_id, sale_date: date, status: 'completed' },
      raw: true,
    });
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/monthly-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get monthly sales report (day-by-day)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *     responses:
 *       200: { description: Daily breakdown for the month }
 */
router.get('/monthly-sales', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    const rows = await Sale.findAll({
      attributes: [
        [fn('DATE', col('sale_date')), 'date'],
        [fn('COUNT', col('id')), 'total_sales'],
        [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'total_revenue'],
      ],
      where: {
        shop_id: req.user.shop_id,
        status: 'completed',
        [Op.and]: [
          literal(`YEAR(sale_date) = ${year}`),
          literal(`MONTH(sale_date) = ${month}`),
        ],
      },
      group: [fn('DATE', col('sale_date'))],
      order: [[fn('DATE', col('sale_date')), 'ASC']],
      raw: true,
    });

    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/top-products:
 *   get:
 *     tags: [Reports]
 *     summary: Get top selling products
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Top products by revenue }
 */
router.get('/top-products', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const { start_date, end_date, limit: queryLimit } = req.query;
    const topLimit = parseInt(queryLimit) || 10;

    const rows = await SaleItem.findAll({
      attributes: [
        [fn('SUM', col('SaleItem.quantity')), 'total_quantity'],
        [fn('SUM', col('SaleItem.total')), 'total_revenue'],
      ],
      include: [
        {
          model: Sale,
          attributes: [],
          where: {
            shop_id: req.user.shop_id,
            status: 'completed',
            sale_date: { [Op.between]: [start_date, end_date] },
          },
        },
        {
          model: Product,
          attributes: ['id', 'name', 'sku'],
        },
      ],
      group: ['Product.id'],
      order: [[fn('SUM', col('SaleItem.total')), 'DESC']],
      limit: topLimit,
      raw: true,
      nest: true,
    });

    const data = rows.map(r => ({
      id: r.Product.id,
      name: r.Product.name,
      sku: r.Product.sku,
      total_quantity: r.total_quantity,
      total_revenue: r.total_revenue,
    }));

    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/profit:
 *   get:
 *     tags: [Reports]
 *     summary: Get profit report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Profit data (sales, cost, profit) }
 */
router.get('/profit', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await SaleItem.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('Sale.net_amount')), 0), 'total_sales'],
        [fn('COALESCE', fn('SUM', literal('SaleItem.quantity * Product.purchase_price')), 0), 'total_cost'],
      ],
      include: [
        {
          model: Sale,
          attributes: [],
          where: {
            shop_id: req.user.shop_id,
            status: 'completed',
            sale_date: { [Op.between]: [start_date, end_date] },
          },
        },
        {
          model: Product,
          attributes: [],
        },
      ],
      raw: true,
    });

    const totalSales = parseFloat(result?.total_sales || 0);
    const totalCost = parseFloat(result?.total_cost || 0);

    return ApiResponse.success(res, {
      total_sales: totalSales,
      total_cost: totalCost,
      profit: totalSales - totalCost,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
