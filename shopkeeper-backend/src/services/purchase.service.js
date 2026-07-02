const purchaseRepo = require('../repositories/mysql/purchase.repository');
const inventoryService = require('./inventory.service');
const { generateId, generateInvoiceNumber, formatDate } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class PurchaseService {
  async getAll(userId, query) {
    const { page, limit, offset } = parsePagination(query);
    const filters = { status: query.status, startDate: query.start_date, endDate: query.end_date };

    const [purchases, total] = await Promise.all([
      purchaseRepo.findAll(userId, { limit, offset, ...filters }),
      purchaseRepo.count(userId, filters),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);
    return { purchases, pagination };
  }

  async getById(id, userId) {
    const purchase = await purchaseRepo.findById(id, userId);
    if (!purchase) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    const items = await purchaseRepo.findItemsByPurchaseId(id);
    return { ...purchase, items };
  }

  async create(userId, data) {
    const uuid = generateId();
    const invoiceNumber = data.invoice_number || generateInvoiceNumber('PUR');

    // Calculate totals
    let totalAmount = 0;
    const items = data.items.map((item) => {
      const total = item.quantity * item.unit_price;
      totalAmount += total;
      return { ...item, total };
    });

    const discount = data.discount || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;

    const purchaseData = {
      uuid,
      user_id: userId,
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
    };

    const purchase = await purchaseRepo.create(purchaseData, items);

    // Update inventory (add stock)
    for (const item of items) {
      await inventoryService.addStock(userId, item.product_id, item.quantity, 'in', 'purchase', purchase.id, `Purchase: ${invoiceNumber}`);
    }

    logger.info(`Purchase created: ${invoiceNumber}`);
    return purchase;
  }

  async updateStatus(id, userId, status) {
    const existing = await purchaseRepo.findById(id, userId);
    if (!existing) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    return purchaseRepo.updateStatus(id, userId, status);
  }
}

module.exports = new PurchaseService();
