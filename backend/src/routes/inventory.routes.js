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

module.exports = router;
