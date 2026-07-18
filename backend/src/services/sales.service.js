const { Sale, SaleItem, Product, Customer, Inventory, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class SalesService {
  async getAll(shopId, query) {
    const { page, limit, offset } = parsePagination(query);
    const pool = require('../config/db').getPool();

    // Build WHERE conditions
    let outerStatusFilter = '';
    let salesDateCondition = '';
    let posDateCondition = '';
    const baseParams = [shopId];
    const outerParams = [];

    if (query.status) {
      // Filter on payment_status in the outer combined query
      outerStatusFilter = ' WHERE payment_status = ?';
      outerParams.push(query.status);
    }

    // Build date params separately (same values, different column prefix)
    const dateParams = [];
    if (query.start_date) {
      salesDateCondition += ' AND DATE(s.created_at) >= ?';
      posDateCondition += ' AND DATE(created_at) >= ?';
      dateParams.push(query.start_date);
    }
    if (query.end_date) {
      salesDateCondition += ' AND DATE(s.created_at) <= ?';
      posDateCondition += ' AND DATE(created_at) <= ?';
      dateParams.push(query.end_date);
    }

    const salesParams = [...baseParams, ...dateParams];
    const posParams = [...baseParams, ...dateParams];

    // Combined query: invoice sales + POS transactions
    const combinedQuery = `
      SELECT * FROM (
        (SELECT s.id, 'invoice' AS type, s.invoice_number,
                c.name AS customer_name, s.sale_date,
                s.total_amount, s.discount, s.net_amount, s.payment_method, s.payment_status, s.status, s.created_at,
                COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'sale' AND p.reference_id = s.id), 0) AS paid_amount
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         WHERE s.shop_id = ?${salesDateCondition})
        UNION ALL
        (SELECT id, 'pos' AS type, receipt_number AS invoice_number,
                customer_name, DATE(created_at) AS sale_date,
                total_amount, discount, net_amount, payment_method,
                CASE WHEN payment_method = 'credit' THEN
                  CASE WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'pos' AND p.reference_id = pos_transactions.id), 0) >= net_amount THEN 'paid'
                       WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'pos' AND p.reference_id = pos_transactions.id), 0) > 0 THEN 'partial'
                       ELSE 'unpaid' END
                ELSE 'paid' END AS payment_status,
                status, created_at,
                CASE WHEN payment_method = 'credit' THEN
                  COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'pos' AND p.reference_id = pos_transactions.id), 0)
                ELSE net_amount END AS paid_amount
         FROM pos_transactions WHERE shop_id = ?${posDateCondition})
      ) combined${outerStatusFilter}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`;

    const countQuery = `
      SELECT COUNT(*) AS total FROM (
        (SELECT s.payment_status
         FROM sales s
         WHERE s.shop_id = ?${salesDateCondition})
        UNION ALL
        (SELECT
                CASE WHEN payment_method = 'credit' THEN
                  CASE WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'pos' AND p.reference_id = pos_transactions.id), 0) >= net_amount THEN 'paid'
                       WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.reference_type = 'pos' AND p.reference_id = pos_transactions.id), 0) > 0 THEN 'partial'
                       ELSE 'unpaid' END
                ELSE 'paid' END AS payment_status
         FROM pos_transactions WHERE shop_id = ?${posDateCondition})
      ) combined${outerStatusFilter}`;

    const queryParams = [...salesParams, ...posParams, ...outerParams, limit, offset];
    const countParams = [...salesParams, ...posParams, ...outerParams];

    const [rows] = await pool.query(combinedQuery, queryParams);
    const [[countResult]] = await pool.query(countQuery, countParams);
    const total = countResult.total;

    const pagination = buildPaginationMeta(total, page, limit);
    return { sales: rows, pagination };
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
