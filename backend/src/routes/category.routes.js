const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/', authenticate, permit('categories:read'), async (req, res, next) => {
  try {
    const rows = await Category.findAll({
      where: { shop_id: req.user.shop_id },
      order: [['name', 'ASC']],
    });
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Dairy Products" }
 *               description: { type: string }
 *     responses:
 *       201: { description: Category created }
 */
router.post('/', authenticate, permit('categories:create'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.create({
      user_id: req.user.id,
      shop_id: req.user.shop_id,
      name,
      description: description || null,
    });
    return ApiResponse.created(res, category);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category
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
 *     responses:
 *       200: { description: Category updated }
 *       404: { description: Category not found }
 */
router.put('/:id', authenticate, permit('categories:update'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const [updated] = await Category.update(
      { name, description: description || null },
      { where: { id: req.params.id, shop_id: req.user.shop_id } }
    );
    if (!updated) return ApiResponse.notFound(res, 'Category not found');
    return ApiResponse.success(res, null, 'Category updated');
  } catch (error) {
    next(error);
  }
});

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
router.delete('/:id', authenticate, permit('categories:delete'), async (req, res, next) => {
  try {
    const deleted = await Category.destroy({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!deleted) return ApiResponse.notFound(res, 'Category not found');
    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
