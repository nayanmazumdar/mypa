const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const { Expense } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: Get all expenses
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list of expenses }
 */
router.get('/', authenticate, permit('expenses:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { start_date, end_date } = req.query;

    const where = { shop_id: req.user.shop_id };
    if (start_date) where.expense_date = { ...where.expense_date, [Op.gte]: start_date };
    if (end_date) where.expense_date = { ...where.expense_date, [Op.lte]: end_date };

    const { rows, count } = await Expense.findAndCountAll({
      where,
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset,
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return ApiResponse.paginated(res, rows, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Record a new expense
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, amount]
 *             properties:
 *               category: { type: string, enum: [Rent, Electricity, Staff Salary, Transport, Packaging, Maintenance, Wastage, Other] }
 *               description: { type: string }
 *               amount: { type: number, minimum: 0.01 }
 *               payment_method: { type: string, enum: [cash, upi, card, bank_transfer], default: cash }
 *               expense_date: { type: string, format: date }
 *     responses:
 *       201: { description: Expense recorded }
 */
router.post('/', authenticate, permit('expenses:create'), async (req, res, next) => {
  try {
    const { category, description, amount, payment_method, expense_date } = req.body;
    if (!category || !amount) return ApiResponse.error(res, 'Category and amount are required', 400);

    const expense = await Expense.create({
      user_id: req.user.id,
      shop_id: req.user.shop_id,
      category,
      description: description || null,
      amount,
      payment_method: payment_method || 'cash',
      expense_date: expense_date || new Date().toISOString().split('T')[0],
    });

    return ApiResponse.created(res, expense);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/expenses/summary:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense summary by category
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Expense summary grouped by category }
 */
router.get('/summary', authenticate, permit('expenses:read'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const where = { shop_id: req.user.shop_id };
    if (start_date) {
      where.expense_date = { [Op.gte]: start_date };
    } else {
      where.expense_date = { [Op.gte]: today.slice(0, 7) + '-01' };
    }
    if (end_date) {
      where.expense_date = { ...where.expense_date, [Op.lte]: end_date };
    }

    const rows = await Expense.findAll({
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where,
      group: ['category'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      raw: true,
    });

    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Expense deleted }
 *       404: { description: Expense not found }
 */
router.delete('/:id', authenticate, permit('expenses:delete'), async (req, res, next) => {
  try {
    const deleted = await Expense.destroy({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!deleted) return ApiResponse.notFound(res, 'Expense not found');
    return ApiResponse.success(res, null, 'Expense deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
