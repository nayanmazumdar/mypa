const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProductValidator, updateProductValidator } = require('../validators/product.validator');

router.use(authenticate);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, SKU, barcode, or brand
 *       - in: query
 *         name: category_id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of products }
 */
router.get('/', permit('products:read'), productController.getAll);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Product details }
 *       404: { description: Product not found }
 */
router.get('/:id', permit('products:read'), productController.getById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, purchase_price, selling_price]
 *             properties:
 *               name: { type: string, example: "Tata Salt" }
 *               description: { type: string }
 *               brand: { type: string, example: "Tata" }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               hsn_code: { type: string }
 *               purchase_price: { type: number, example: 18 }
 *               selling_price: { type: number, example: 22 }
 *               mrp: { type: number, example: 22 }
 *               unit: { type: string, enum: [piece, kg, gram, litre, ml, meter, box, dozen, packet, bottle], default: piece }
 *               weight: { type: string }
 *               tax_rate: { type: number, default: 0 }
 *               category_id: { type: integer }
 *               min_stock_level: { type: number }
 *               max_stock_level: { type: number }
 *               expiry_date: { type: string, format: date }
 *               image_url: { type: string }
 *               is_featured: { type: boolean, default: false }
 *     responses:
 *       201: { description: Product created }
 *       400: { description: Validation error }
 */
router.post('/', permit('products:create'), validate(createProductValidator), productController.create);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product
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
 *               name: { type: string }
 *               description: { type: string }
 *               brand: { type: string }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               purchase_price: { type: number }
 *               selling_price: { type: number }
 *               mrp: { type: number }
 *               unit: { type: string }
 *               category_id: { type: integer }
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.put('/:id', permit('products:update'), validate(updateProductValidator), productController.update);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Product deleted }
 *       404: { description: Product not found }
 */
router.delete('/:id', permit('products:delete'), productController.delete);

module.exports = router;
