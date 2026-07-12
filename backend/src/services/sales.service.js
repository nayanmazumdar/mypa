const { Sale, SaleItem, Product, Customer, Inventory, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class SalesService {
  async getAll(shopId, query) {
    const { page, limit, offset } = parsePagination(query);
    const where = { shop_id: shopId };

    if (query.status) where.status = query.status;
    if (query.start_date) where.sale_date = { ...where.sale_date, [Op.gte]: query.start_date };
    if (query.end_date) where.sale_date = { ...where.sale_date, [Op.lte]: query.end_date };

    const { rows, count } = await Sale.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const sales = rows.map(s => {
      const plain = s.get({ plain: true });
      plain.customer_name = plain.Customer?.name || null;
      delete plain.Customer;
      return plain;
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return { sales, pagination };
  }

  async getById(id, shopId) {
    const sale = await Sale.findOne({
      where: { id, shop_id: shopId },
      include: [
        { model: Customer, attributes: ['name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, attributes: ['name', 'sku'] }] },
      ],
    });
    if (!sale) {
      const error = new Error('Sale not found');
      error.statusCode = 404;
      throw error;
    }

    const plain = sale.get({ plain: true });
    plain.customer_name = plain.Customer?.name || null;
    delete plain.Customer;
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
    const invoiceNumber = generateInvoiceNumber('INV');

    let totalAmount = 0;
    const items = data.items.map((item) => {
      const total = item.quantity * item.unit_price - (item.discount || 0);
      totalAmount += total;
      return { ...item, total };
    });

    const discount = data.discount || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;

    const result = await sequelize.transaction(async (t) => {
      const sale = await Sale.create({
        uuid,
        user_id: shopId, // legacy field
        shop_id: shopId,
        customer_id: data.customer_id || null,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        discount,
        tax_amount: taxAmount,
        net_amount: netAmount,
        payment_status: data.payment_status || 'unpaid',
        payment_method: data.payment_method || 'cash',
        status: 'completed',
        notes: data.notes || null,
        sale_date: formatDate(new Date()),
      }, { transaction: t });

      for (const item of items) {
        await SaleItem.create({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          total: item.total,
        }, { transaction: t });

        // Reduce inventory
        await Inventory.decrement('quantity', {
          by: item.quantity,
          where: { product_id: item.product_id, shop_id: shopId },
          transaction: t,
        });

        // Log stock movement
        await StockMovement.create({
          product_id: item.product_id,
          user_id: shopId,
          shop_id: shopId,
          type: 'out',
          quantity: item.quantity,
          reference_type: 'sale',
          reference_id: sale.id,
          notes: `Sale: ${invoiceNumber}`,
        }, { transaction: t });
      }

      return sale;
    });

    logger.info(`Sale created: ${invoiceNumber}`);
    return result;
  }

  async updateStatus(id, shopId, status) {
    const sale = await Sale.findOne({ where: { id, shop_id: shopId } });
    if (!sale) {
      const error = new Error('Sale not found');
      error.statusCode = 404;
      throw error;
    }
    await sale.update({ status });
    return sale;
  }
}

module.exports = new SalesService();
