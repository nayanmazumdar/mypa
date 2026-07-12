const express = require('express');
const router = express.Router();
const { Sale, SaleItem, Customer, Product, User } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/invoices/{saleId}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice data for a sale
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema: { type: integer }
 *         description: Sale ID to generate invoice for
 *     responses:
 *       200: { description: Invoice data with sale, items, and shop info }
 *       404: { description: Sale not found }
 */
router.get('/:saleId', authenticate, permit('invoices:read'), async (req, res, next) => {
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.saleId, shop_id: req.user.shop_id },
      include: [
        { model: Customer, attributes: ['name', 'phone', 'address'] },
      ],
    });

    if (!sale) return ApiResponse.notFound(res, 'Sale not found');

    const items = await SaleItem.findAll({
      where: { sale_id: req.params.saleId },
      include: [{ model: Product, attributes: ['name', 'sku'] }],
    });

    const user = await User.findByPk(req.user.id, {
      attributes: ['name', 'email', 'phone', 'shop_name', 'address'],
    });

    const salePlain = sale.get({ plain: true });
    salePlain.customer_name = salePlain.Customer?.name || null;
    salePlain.customer_phone = salePlain.Customer?.phone || null;
    salePlain.customer_address = salePlain.Customer?.address || null;
    delete salePlain.Customer;

    const itemsPlain = items.map(i => {
      const p = i.get({ plain: true });
      p.product_name = p.Product?.name || null;
      p.sku = p.Product?.sku || null;
      delete p.Product;
      return p;
    });

    return ApiResponse.success(res, {
      sale: salePlain,
      items: itemsPlain,
      shop: user ? user.get({ plain: true }) : {},
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
