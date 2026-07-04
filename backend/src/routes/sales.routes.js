const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

const auth = [
  authenticateJWT,
  authorizeRoles(ROLES.BUSINESS_OWNER, ROLES.STAFF),
];

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management
 */

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customer_id:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product_id, quantity, unit_price]
 *                   properties:
 *                     product_id: { type: integer }
 *                     quantity:   { type: number }
 *                     unit_price: { type: number }
 *                     discount:   { type: number }
 *               payment_method:
 *                 type: string
 *                 enum: [cash, credit, card, upi]
 *               sale_date:
 *                 type: string
 *                 format: date
 *               discount:   { type: number }
 *               tax_amount: { type: number }
 *               notes:      { type: string }
 *     responses:
 *       201: { description: Sale created }
 *       400: { description: Validation error }
 */
router.post('/', ...auth, salesController.create);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: List sales with optional filters and pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: customer_id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of sales }
 */
router.get('/', ...auth, salesController.getAll);

// ─── Static routes MUST come before /:id ──────────────────────────────────────

/**
 * @swagger
 * /api/sales/today:
 *   get:
 *     tags: [Sales]
 *     summary: Get today's sales summary and list
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today's sales }
 */
router.get('/today', ...auth, salesController.getToday);

/**
 * @swagger
 * /api/sales/monthly:
 *   get:
 *     tags: [Sales]
 *     summary: Get monthly sales totals grouped by day
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Monthly totals }
 */
router.get('/monthly', ...auth, salesController.getMonthly);

/**
 * @swagger
 * /api/sales/customer/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get all sales for a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Customer sales }
 */
router.get('/customer/:id', ...auth, salesController.getByCustomer);

// ─── Dynamic routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID with line items
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Sale details }
 *       404: { description: Not found }
 */
router.get('/:id', ...auth, salesController.getById);

/**
 * @swagger
 * /api/sales/{id}:
 *   put:
 *     tags: [Sales]
 *     summary: Update sale status or notes
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:         { type: string }
 *               notes:          { type: string }
 *               payment_status: { type: string }
 *     responses:
 *       200: { description: Sale updated }
 */
router.put('/:id', ...auth, salesController.update);

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     tags: [Sales]
 *     summary: Delete a sale
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Sale deleted }
 */
router.delete('/:id', ...auth, salesController.delete);

module.exports = router;
