const salesRepo = require('../repositories/mysql/sales.repository');
const inventoryService = require('./inventory.service');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class SalesService {
  async getAll(userId, query) {
    const { page, limit, offset } = parsePagination(query);
    const filters = { status: query.status, startDate: query.start_date, endDate: query.end_date };

    const [sales, total] = await Promise.all([
      salesRepo.findAll(userId, { limit, offset, ...filters }),
      salesRepo.count(userId, filters),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);
    return { sales, pagination };
  }

  async getById(id, userId) {
    const sale = await salesRepo.findById(id, userId);
    if (!sale) {
      const error = new Error('Sale not found');
      error.statusCode = 404;
      throw error;
    }
    const items = await salesRepo.findItemsBySaleId(id);
    return { ...sale, items };
  }

  async create(userId, data) {
    const uuid = generateId();
    const invoiceNumber = generateInvoiceNumber('INV');

    // Calculate totals
    let totalAmount = 0;
    const items = data.items.map((item) => {
      const total = item.quantity * item.unit_price - (item.discount || 0);
      totalAmount += total;
      return { ...item, total };
    });

    const discount = data.discount || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;

    const saleData = {
      uuid,
      user_id: userId,
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
    };

    const sale = await salesRepo.create(saleData, items);

    // Update inventory (reduce stock)
    for (const item of items) {
      await inventoryService.addStock(userId, item.product_id, item.quantity, 'out', 'sale', sale.id, `Sale: ${invoiceNumber}`);
    }

    logger.info(`Sale created: ${invoiceNumber}`);
    return sale;
  }

  async updateStatus(id, userId, status) {
    const existing = await salesRepo.findById(id, userId);
    if (!existing) {
      const error = new Error('Sale not found');
      error.statusCode = 404;
      throw error;
    }
    return salesRepo.updateStatus(id, userId, status);
  }
}

module.exports = new SalesService();
