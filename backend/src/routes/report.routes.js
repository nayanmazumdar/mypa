const express = require('express');
const router = express.Router();
const reportService = require('../services/report.service');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Get dashboard summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard data }
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const data = await reportService.getDashboardSummary(req.user.id);
    return ApiResponse.success(res, data);
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
 *     responses:
 *       200: { description: Daily sales data }
 */
router.get('/daily-sales', authenticate, async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = await reportService.getDailySales(req.user.id, date);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/monthly-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get monthly sales report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Monthly sales data }
 */
router.get('/monthly-sales', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const data = await reportService.getMonthlySales(req.user.id, year, month);
    return ApiResponse.success(res, data);
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
 *     responses:
 *       200: { description: Top products }
 */
router.get('/top-products', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const data = await reportService.getTopProducts(req.user.id, start_date, end_date, parseInt(limit) || 10);
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
 *     responses:
 *       200: { description: Profit data }
 */
router.get('/profit', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.getProfitReport(req.user.id, start_date, end_date);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
