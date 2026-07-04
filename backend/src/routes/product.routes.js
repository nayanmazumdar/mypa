const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

// All product routes require authentication + business role
router.use(authenticateJWT);
router.use(authorizeRoles(ROLES.BUSINESS_OWNER, ROLES.STAFF, ROLES.ADMIN));

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products with pagination and optional search/filter
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or SKU
 *       - in: query
 *         name: category_id
 *         schema: { type: integer }
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of products }
 */
router.get('/', productController.getAll);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     tags: [Products]
 *     summary: Search products by name or SKU (active only, max 50 results)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search term
 *     responses:
 *       200: { description: Matching products }
 */
// NOTE: /search must be declared BEFORE /:id to avoid route conflict
router.get('/search', productController.search);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
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
router.get('/:id', productController.getById);

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
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               category_id: { type: integer }
 *               description: { type: string }
 *               purchase_price: { type: number }
 *               selling_price: { type: number }
 *               unit: { type: string }
 *               tax_rate: { type: number }
 *               image_url: { type: string }
 *     responses:
 *       201: { description: Product created }
 */
router.post('/', productController.create);

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
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.put('/:id', productController.update);

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
router.delete('/:id', productController.delete);

module.exports = router;
