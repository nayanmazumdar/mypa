const purchaseRepo = require('../repositories/mysql/purchase.repository');
const inventoryService = require('./inventory.service');
const { generateId, generateInvoiceNumber, localDateStr } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class PurchaseService {
  async getAll(userId, shopId, query) {
    const { page, limit, offset } = parsePagination(query);
    const filters = { status: query.status, startDate: query.start_date, endDate: query.end_date };

    const [purchases, total] = await Promise.all([
      purchaseRepo.findAll(shopId, { limit, offset, ...filters }),
      purchaseRepo.count(shopId, filters),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);
    return { purchases, pagination };
  }

  async getById(id, shopId) {
    const purchase = await purchaseRepo.findById(id, shopId);
    if (!purchase) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    const items = await purchaseRepo.findItemsByPurchaseId(id);
    return { ...purchase, items };
  }

  async create(userId, shopId, data) {
    const uuid = generateId();
    const invoiceNumber = data.invoice_number || generateInvoiceNumber('PUR');

    // Calculate totals
    let totalAmount = 0;
    const items = data.items.map((item) => {
      const total = item.quantity * item.unit_price;
      totalAmount += total;
      return { ...item, total };
    });    const discount = data.discount || 0;
    const taxAmount = data.tax_amount || 0;
    const netAmount = totalAmount - discount + taxAmount;

    const paymentStatus = data.payment_status || 'unpaid';

    // Determine paid_amount and due_amount based on payment_status
    let paidAmount = 0;
    let dueAmount  = 0;
    if (paymentStatus === 'paid') {
      paidAmount = netAmount;
      dueAmount  = 0;
    } else if (paymentStatus === 'partial') {
      paidAmount = parseFloat(data.paid_amount) || 0;
      dueAmount  = parseFloat((netAmount - paidAmount).toFixed(2));
    } else {
      // unpaid
      paidAmount = 0;
      dueAmount  = netAmount;
    }

    const purchaseData = {
      uuid,
      user_id: userId,
      shop_id: shopId,
      supplier_id: data.supplier_id || null,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      discount,
      tax_amount: taxAmount,
      net_amount: netAmount,
      paid_amount: paidAmount,
      due_amount:  dueAmount,
      original_due_amount: dueAmount,
      payment_status: paymentStatus,
      payment_method: data.payment_method || 'cash',
      status: 'completed',
      notes: data.notes || null,
      purchase_date: localDateStr(new Date()),
    };


    const purchase = await purchaseRepo.create(purchaseData, items);

    // Update inventory only for catalogue items (not manual entries)
    for (const item of items) {
      if (item.product_id) {
        await inventoryService.addStock(userId, item.product_id, item.quantity, 'in', 'purchase', purchase.id, `Purchase: ${invoiceNumber}`);
      }
    }

    logger.info(`Purchase created: ${invoiceNumber}`);
    return purchase;
  }

  async updateStatus(id, shopId, status) {
    const existing = await purchaseRepo.findById(id, shopId);
    if (!existing) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    return purchaseRepo.updateStatus(id, shopId, status);
  }

  async clearDue(id, shopId) {
    const existing = await purchaseRepo.findById(id, shopId);
    if (!existing) {
      const error = new Error('Purchase not found');
      error.statusCode = 404;
      throw error;
    }
    if (existing.payment_status === 'paid') {
      const error = new Error('Purchase is already fully paid');
      error.statusCode = 400;
      throw error;
    }
    return purchaseRepo.clearDue(id, shopId, existing.net_amount);
  }
}

module.exports = new PurchaseService();
