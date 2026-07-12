const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createSaleValidator } = require('../validators/sale.validator');

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: Get all sales
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed, cancelled] }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: List of sales }
 */
router.get('/', authenticate, permit('sales:read'), salesController.getAll);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Sale details }
 */
router.get('/:id', authenticate, permit('sales:read'), salesController.getById);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Sale created }
 */
router.post('/', authenticate, permit('sales:create'), validate(createSaleValidator), salesController.create);

/**
 * @swagger
 * /api/sales/{id}/status:
 *   patch:
 *     tags: [Sales]
 *     summary: Update sale status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/:id/status', authenticate, permit('sales:update'), salesController.updateStatus);

module.exports = router;
