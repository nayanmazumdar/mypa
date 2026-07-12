const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createPurchaseValidator } = require('../validators/purchase.validator');

/**
 * @swagger
 * /api/purchases:
 *   get:
 *     tags: [Purchases]
 *     summary: Get all purchases
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
 *     responses:
 *       200: { description: List of purchases }
 */
router.get('/', authenticate, permit('purchases:read'), purchaseController.getAll);

/**
 * @swagger
 * /api/purchases/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Get purchase by ID
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase details }
 */
router.get('/:id', authenticate, permit('purchases:read'), purchaseController.getById);

/**
 * @swagger
 * /api/purchases:
 *   post:
 *     tags: [Purchases]
 *     summary: Create a new purchase
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Purchase created }
 */
router.post('/', authenticate, permit('purchases:create'), validate(createPurchaseValidator), purchaseController.create);

/**
 * @swagger
 * /api/purchases/{id}/status:
 *   patch:
 *     tags: [Purchases]
 *     summary: Update purchase status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/:id/status', authenticate, permit('purchases:update'), purchaseController.updateStatus);

/**
 * @swagger
 * /api/purchases/{id}/clear-due:
 *   patch:
 *     tags: [Purchases]
 *     summary: Clear due amount and mark as paid
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Due amount cleared }
 */
router.patch('/:id/clear-due', authenticate, purchaseController.clearDue);

module.exports = router;
