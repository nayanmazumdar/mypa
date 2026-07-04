const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

// All category routes require authentication + business role
router.use(authenticateJWT);
router.use(authorizeRoles(ROLES.BUSINESS_OWNER, ROLES.STAFF, ROLES.ADMIN));

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories for the authenticated business
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/', categoryController.getAll);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
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
 *     responses:
 *       201: { description: Category created }
 */
router.post('/', categoryController.create);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category name
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Category updated }
 *       404: { description: Category not found }
 */
router.put('/:id', categoryController.update);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Category deleted }
 *       404: { description: Category not found }
 */
router.delete('/:id', categoryController.delete);

module.exports = router;
