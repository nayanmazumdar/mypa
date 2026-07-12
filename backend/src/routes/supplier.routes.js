const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Supplier } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get all suppliers
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
 *         description: Search by name, company, or phone
 *     responses:
 *       200: { description: Paginated list of suppliers }
 */
router.get('/', authenticate, permit('suppliers:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    const where = { shop_id: req.user.shop_id };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Supplier.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return ApiResponse.paginated(res, rows, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Supplier details }
 *       404: { description: Supplier not found }
 */
router.get('/:id', authenticate, permit('suppliers:read'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!supplier) return ApiResponse.notFound(res, 'Supplier not found');
    return ApiResponse.success(res, supplier);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a new supplier
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Ravi Traders" }
 *               company: { type: string }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               gst_number: { type: string }
 *     responses:
 *       201: { description: Supplier created }
 */
router.post('/', authenticate, permit('suppliers:create'), async (req, res, next) => {
  try {
    const { name, email, phone, company, address, gst_number } = req.body;
    const supplier = await Supplier.create({
      uuid: generateId(),
      user_id: req.user.id,
      shop_id: req.user.shop_id,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      address: address || null,
      gst_number: gst_number || null,
    });
    return ApiResponse.created(res, supplier);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     tags: [Suppliers]
 *     summary: Update a supplier
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
 *               company: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               gst_number: { type: string }
 *     responses:
 *       200: { description: Supplier updated }
 *       404: { description: Supplier not found }
 */
router.put('/:id', authenticate, permit('suppliers:update'), async (req, res, next) => {
  try {
    const { name, email, phone, company, address, gst_number } = req.body;
    const [updated] = await Supplier.update(
      { name, email: email || null, phone: phone || null, company: company || null, address: address || null, gst_number: gst_number || null },
      { where: { id: req.params.id, shop_id: req.user.shop_id } }
    );
    if (!updated) return ApiResponse.notFound(res, 'Supplier not found');
    return ApiResponse.success(res, null, 'Supplier updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Supplier deleted }
 *       404: { description: Supplier not found }
 */
router.delete('/:id', authenticate, permit('suppliers:delete'), async (req, res, next) => {
  try {
    const deleted = await Supplier.destroy({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!deleted) return ApiResponse.notFound(res, 'Supplier not found');
    return ApiResponse.success(res, null, 'Supplier deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
