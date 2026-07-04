const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate } = require('../middlewares/auth.middleware');

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
router.get('/', authenticate, inventoryController.getAll);

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
router.get('/low-stock', authenticate, inventoryController.getLowStock);

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
router.post('/add', authenticate, inventoryController.addStock);

module.exports = router;
