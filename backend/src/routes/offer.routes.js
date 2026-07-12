const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Offer, Category, Product } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/offers:
 *   get:
 *     tags: [Offers]
 *     summary: Get all offers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: active_only
 *         schema: { type: string, enum: ["true", "false"] }
 *     responses:
 *       200: { description: List of offers }
 */
router.get('/', authenticate, permit('offers:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { active_only } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const where = { shop_id: req.user.shop_id };
    if (active_only === 'true') {
      where.is_active = true;
      where.start_date = { [Op.lte]: today };
      where.end_date = { [Op.gte]: today };
    }

    const { rows, count } = await Offer.findAndCountAll({
      where,
      include: [
        { model: Category, attributes: ['name'] },
        { model: Product, attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const data = rows.map(o => {
      const plain = o.get({ plain: true });
      plain.category_name = plain.Category?.name || null;
      plain.product_name = plain.Product?.name || null;
      delete plain.Category;
      delete plain.Product;
      return plain;
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return ApiResponse.paginated(res, data, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/offers/active:
 *   get:
 *     tags: [Offers]
 *     summary: Get currently active offers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active offers }
 */
router.get('/active', authenticate, permit('offers:read'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = await Offer.findAll({
      where: {
        shop_id: req.user.shop_id,
        is_active: true,
        start_date: { [Op.lte]: today },
        end_date: { [Op.gte]: today },
      },
      include: [
        { model: Category, attributes: ['name'] },
        { model: Product, attributes: ['name'] },
      ],
      order: [['discount_value', 'DESC']],
    });

    const data = rows.map(o => {
      const plain = o.get({ plain: true });
      plain.category_name = plain.Category?.name || null;
      plain.product_name = plain.Product?.name || null;
      delete plain.Category;
      delete plain.Product;
      return plain;
    });

    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/offers:
 *   post:
 *     tags: [Offers]
 *     summary: Create a new offer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, discount_value, start_date, end_date]
 *             properties:
 *               name: { type: string, example: "Summer Sale 20% Off" }
 *               description: { type: string }
 *               discount_type: { type: string, enum: [percentage, flat], default: percentage }
 *               discount_value: { type: number }
 *               min_purchase_amount: { type: number }
 *               max_discount_amount: { type: number }
 *               applicable_to: { type: string, enum: [all, category, product], default: all }
 *               category_id: { type: integer }
 *               product_id: { type: integer }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       201: { description: Offer created }
 */
router.post('/', authenticate, permit('offers:create'), async (req, res, next) => {
  try {
    const { name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date } = req.body;
    if (!name || !discount_value || !start_date || !end_date) {
      return ApiResponse.error(res, 'Name, discount value, start date and end date are required', 400);
    }

    const offer = await Offer.create({
      shop_id: req.user.shop_id,
      name, description: description || null,
      discount_type: discount_type || 'percentage', discount_value,
      min_purchase_amount: min_purchase_amount || 0, max_discount_amount: max_discount_amount || null,
      applicable_to: applicable_to || 'all',
      category_id: category_id || null, product_id: product_id || null,
      start_date, end_date,
    });

    return ApiResponse.created(res, offer);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     tags: [Offers]
 *     summary: Update an offer
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
 *               discount_type: { type: string }
 *               discount_value: { type: number }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Offer updated }
 */
router.put('/:id', authenticate, permit('offers:update'), async (req, res, next) => {
  try {
    const { name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date, is_active } = req.body;

    await Offer.update(
      { name, description: description || null, discount_type, discount_value, min_purchase_amount: min_purchase_amount || 0, max_discount_amount: max_discount_amount || null, applicable_to: applicable_to || 'all', category_id: category_id || null, product_id: product_id || null, start_date, end_date, is_active: is_active !== undefined ? is_active : true },
      { where: { id: req.params.id, shop_id: req.user.shop_id } }
    );

    return ApiResponse.success(res, null, 'Offer updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/offers/{id}:
 *   delete:
 *     tags: [Offers]
 *     summary: Delete an offer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Offer deleted }
 */
router.delete('/:id', authenticate, permit('offers:delete'), async (req, res, next) => {
  try {
    await Offer.destroy({ where: { id: req.params.id, shop_id: req.user.shop_id } });
    return ApiResponse.success(res, null, 'Offer deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/offers/for-product/{productId}:
 *   get:
 *     tags: [Offers]
 *     summary: Get best active offer for a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Best applicable offer or null }
 */
router.get('/for-product/:productId', authenticate, permit('offers:read'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const product = await Product.findOne({ where: { id: req.params.productId, shop_id: req.user.shop_id }, attributes: ['category_id'] });

    const rows = await Offer.findAll({
      where: {
        shop_id: req.user.shop_id,
        is_active: true,
        start_date: { [Op.lte]: today },
        end_date: { [Op.gte]: today },
        [Op.or]: [
          { applicable_to: 'all' },
          { applicable_to: 'product', product_id: req.params.productId },
          { applicable_to: 'category', category_id: product?.category_id || 0 },
        ],
      },
      order: [['discount_value', 'DESC']],
      limit: 1,
    });

    return ApiResponse.success(res, rows[0] || null);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
