const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

const allowedRoles = [ROLES.BUSINESS_OWNER, ROLES.STAFF];

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory items (supports ?low_stock=true)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: low_stock
 *         schema: { type: boolean }
 *         description: Filter to items at or below min_stock_level
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of inventory items
 */
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(...allowedRoles),
  inventoryController.getAll.bind(inventoryController)
);

/**
 * @swagger
 * /api/inventory/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Manual stock adjustment
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: ID of the product to adjust
 *               quantity:
 *                 type: number
 *                 description: Amount to add (positive) or remove (negative) from current stock
 *               reason:
 *                 type: string
 *                 description: Reason for the adjustment
 *               type:
 *                 type: string
 *                 enum: [adjustment, return, damaged, correction]
 *                 default: adjustment
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 */
router.post(
  '/adjust',
  authenticateJWT,
  authorizeRoles(...allowedRoles),
  inventoryController.adjust.bind(inventoryController)
);

/**
 * @swagger
 * /api/inventory/movements:
 *   get:
 *     tags: [Inventory]
 *     summary: List stock movements
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: integer }
 *         description: Filter movements by product
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of stock movements
 */
router.get(
  '/movements',
  authenticateJWT,
  authorizeRoles(...allowedRoles),
  inventoryController.getMovements.bind(inventoryController)
);

module.exports = router;
