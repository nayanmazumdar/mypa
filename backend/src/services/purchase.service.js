const { Purchase, PurchaseItem, Product, Supplier, Inventory, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class PurchaseService {
  async getAll(shopId, query) {
    const { page, limit, offset } = parsePagination(query);
    const where = { shop_id: shopId };

    if (query.status) where.status = query.status;
    if (query.start_date) where.purchase_date = { ...where.purchase_date, [Op.gte]: query.start_date };
    if (query.end_date) where.purchase_date = { ...where.purchase_date, [Op.lte]: query.end_date };

    const { rows, count } = await Purchase.findAndCountAll({
      where,
      include: [{ model: Supplier, attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const purchases = rows.map(p => {
      const plain = p.get({ plain: true });
      plain.supplier_name = plain.Supplier?.name || null;
      delete plain.Supplier;
      return plain;
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return { purchases, pagination };
  }

  async getById(id, shopId) {
    const purchase = await Purchase.findOne({
      where: { id, shop_id: shopId },
      include: [
        { model: Supplier, attributes: ['name'] },
        { model: PurchaseItem, as: 'items', include: [{ model: Product, attributes: ['name', 'sku'] }] },
      ],
    });
    if (!purchase) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }

    const plain = purchase.get({ plain: true });
    plain.supplier_name = plain.Supplier?.name || null;
    delete plain.Supplier;
    plain.items = (plain.items || []).map(i => ({
      ...i,
      product_name: i.Product?.name || null,
      sku: i.Product?.sku || null,
      Product: undefined,
    }));
    return plain;
  }

  async create(shopId, data) {
    const uuid = generateId();
    const invoiceNumber = data.invoice_number || generateInvoiceNumber('PUR');

    let totalAmount = 0;
    const items = data.items.map((item) => {
      const total = item.quantity * item.unit_price;
      totalAmount += total;
      return { ...item, total };
    });

    const discount = data.discount || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;

    const result = await sequelize.transaction(async (t) => {
      const purchase = await Purchase.create({
        uuid,
        user_id: shopId,
        shop_id: shopId,
        supplier_id: data.supplier_id || null,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        discount,
        tax_amount: taxAmount,
        net_amount: netAmount,
        payment_status: data.payment_status || 'unpaid',
        payment_method: data.payment_method || 'cash',
        status: 'completed',
        notes: data.notes || null,
        purchase_date: formatDate(new Date()),
      }, { transaction: t });

      for (const item of items) {
        await PurchaseItem.create({
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }, { transaction: t });

        // Increase inventory
        await Inventory.increment('quantity', {
          by: item.quantity,
          where: { product_id: item.product_id, shop_id: shopId },
          transaction: t,
        });

        // Log stock movement
        await StockMovement.create({
          product_id: item.product_id,
          user_id: shopId,
          shop_id: shopId,
          type: 'in',
          quantity: item.quantity,
          reference_type: 'purchase',
          reference_id: purchase.id,
          notes: `Purchase: ${invoiceNumber}`,
        }, { transaction: t });
      }

      return purchase;
    });

    logger.info(`Purchase created: ${invoiceNumber}`);
    return result;
  }

  async updateStatus(id, shopId, status) {
    const purchase = await Purchase.findOne({ where: { id, shop_id: shopId } });
    if (!purchase) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    await purchase.update({ status });
    return purchase;
  }
}

module.exports = new PurchaseService();
