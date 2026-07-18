const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId, localDateStr } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { broadcastToShop } = require('./sse.routes');

// Generate receipt number
const generateReceiptNumber = () => {
  const date = new Date();
  const prefix = 'RCP';
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${random}`;
};

/**
 * @swagger
 * /api/pos/products:
 *   get:
 *     tags: [POS]
 *     summary: Get active products for POS with offers applied
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Products with stock and offer prices }
 */
router.get('/products', authenticate, permit('pos:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { category_id, search, page: pageParam, limit: limitParam } = req.query;
    const today = localDateStr();
    const page = Math.max(1, parseInt(pageParam) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam) || 50));
    const offset = (page - 1) * limit;

    let baseWhere = 'WHERE p.shop_id = ? AND p.is_active = 1';
    const params = [req.user.shop_id];

    if (category_id) {
      baseWhere += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (search && search.trim().length > 0) {
      baseWhere += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM products p ${baseWhere}`;
    const [[{ total }]] = await pool.query(countQuery, params);

    // Fetch page
    let query = `SELECT p.id, p.name, p.selling_price, p.mrp, p.unit, p.category_id, p.barcode, p.sku,
                 p.image_url, p.brand, p.weight, c.name as category_name,
                 COALESCE(i.quantity, 0) as stock
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN inventory i ON p.id = i.product_id AND i.shop_id = p.shop_id
                 ${baseWhere}
                 ORDER BY p.name ASC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(query, queryParams);

    // Sync offer states before fetching — ensures paused/expired offers never apply
    await pool.query(
      `UPDATE offers SET is_active = 0 WHERE shop_id = ? AND end_date < ?`,
      [req.user.shop_id, today]
    );
    await pool.query(
      `UPDATE offers SET is_active = 1 WHERE shop_id = ? AND is_paused = 0 AND start_date <= ? AND end_date >= ?`,
      [req.user.shop_id, today, today]
    );

    // Get active, non-paused offers for the shop
    const [offers] = await pool.query(
      `SELECT * FROM offers WHERE shop_id = ? AND is_active = 1 AND is_paused = 0 AND start_date <= ? AND end_date >= ?`,
      [req.user.shop_id, today, today]
    );

    // Apply best offer to each product
    const products = rows.map(p => {
      const price = parseFloat(p.selling_price);
      let offer = null;
      let offer_price = null;

      for (const o of offers) {
        const applies = o.applicable_to === 'all'
          || (o.applicable_to === 'product' && o.product_id === p.id)
          || (o.applicable_to === 'category' && o.category_id === p.category_id);
        if (!applies) continue;

        let discounted;
        if (o.discount_type === 'percentage') {
          discounted = Math.round(price * (1 - o.discount_value / 100) * 100) / 100;
        } else {
          discounted = Math.max(0, price - o.discount_value);
        }
        if (o.max_discount_amount && (price - discounted) > o.max_discount_amount) {
          discounted = price - o.max_discount_amount;
        }

        if (!offer_price || discounted < offer_price) {
          offer_price = discounted;
          offer = { id: o.id, name: o.name, discount_type: o.discount_type, discount_value: o.discount_value };
        }
      }

      return { ...p, offer, offer_price };
    });

    return res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pos/barcode/{code}:
 *   get:
 *     tags: [POS]
 *     summary: Lookup product by barcode/SKU
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Barcode or SKU
 *     responses:
 *       200: { description: Product found }
 *       404: { description: Product not found }
 */
router.get('/barcode/:code', authenticate, permit('pos:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.selling_price, p.unit, p.barcode, p.sku, c.name as category_name,
              COALESCE(i.quantity, 0) as stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id AND i.user_id = p.user_id
       WHERE p.shop_id = ? AND p.is_active = 1 AND (p.barcode = ? OR p.sku = ?)`,
      [req.user.shop_id, req.params.code, req.params.code]
    );

    if (rows.length === 0) {
      return ApiResponse.notFound(res, 'Product not found for this barcode');
    }
    return ApiResponse.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pos/checkout:
 *   post:
 *     tags: [POS]
 *     summary: Process a POS checkout/sale
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id: { type: integer }
 *                     product_name: { type: string }
 *                     quantity: { type: number }
 *                     unit: { type: string }
 *                     unit_price: { type: number }
 *               customer_name: { type: string }
 *               customer_id: { type: integer }
 *               discount: { type: number }
 *               payment_method: { type: string, enum: [cash, upi, card, credit] }
 *               amount_received: { type: number }
 *     responses:
 *       201: { description: Checkout successful, returns receipt }
 *       400: { description: Cart is empty }
 */
router.post('/checkout', authenticate, permit('pos:checkout'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { items, customer_name, customer_id, discount, payment_method, amount_received, payments } = req.body;

    if (!items || items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 400);
    }

    // Idempotency check — prevent duplicate submissions from offline sync
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (idempotencyKey) {
      const [existing] = await pool.query(
        'SELECT id, receipt_number FROM pos_transactions WHERE shop_id = ? AND uuid = ?',
        [req.user.shop_id, idempotencyKey]
      );
      if (existing.length > 0) {
        // Already processed — return success with existing data (don't duplicate)
        return res.status(409).json({
          success: true, message: 'Transaction already processed',
          data: { id: existing[0].id, receipt_number: existing[0].receipt_number, duplicate: true },
        });
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Calculate totals
      let totalAmount = 0;
      const processedItems = items.map((item) => {
        const total = Math.round(item.quantity * item.unit_price * 100) / 100;
        totalAmount += total;
        return { ...item, total };
      });

      const discountAmount = discount || 0;
      const netAmount = Math.round((totalAmount - discountAmount) * 100) / 100;

      // Multi-payment support: payments = [{ method: 'cash', amount: 500 }, { method: 'upi', amount: 200 }]
      let resolvedPaymentMethod = payment_method || 'cash';
      let resolvedAmountReceived = amount_received || netAmount;
      let paymentsJson = null;

      if (payments && Array.isArray(payments) && payments.length > 0) {
        resolvedAmountReceived = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        resolvedPaymentMethod = payments.length > 1 ? 'split' : payments[0].method;
        paymentsJson = JSON.stringify(payments);
      }

      const changeAmount = resolvedAmountReceived > netAmount
        ? Math.round((resolvedAmountReceived - netAmount) * 100) / 100 : 0;

      const uuid = idempotencyKey || generateId();
      const receiptNumber = generateReceiptNumber();

      // Insert transaction — biller_id captures who processed this sale (staff/manager/admin)
      const [txResult] = await connection.query(
        `INSERT INTO pos_transactions (uuid, user_id, biller_id, shop_id, customer_name, customer_id, total_amount, discount, net_amount, payment_method, amount_received, change_amount, receipt_number, payments_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, req.user.id, req.user.id, req.user.shop_id, customer_name || null, customer_id || null, totalAmount, discountAmount, netAmount, resolvedPaymentMethod, resolvedAmountReceived, changeAmount > 0 ? changeAmount : 0, receiptNumber, paymentsJson]
      );
      const transactionId = txResult.insertId;

      // Insert items and update inventory with stock validation + row locking
      for (const item of processedItems) {
        // Lock row for update to prevent overselling
        const [stockRows] = await connection.query(
          `SELECT COALESCE(quantity, 0) as quantity FROM inventory WHERE product_id = ? AND shop_id = ? FOR UPDATE`,
          [item.product_id, req.user.shop_id]
        );
        const currentStock = stockRows.length > 0 ? parseFloat(stockRows[0].quantity) : 0;

        if (currentStock < item.quantity) {
          await connection.rollback();
          return ApiResponse.error(
            res,
            `Insufficient stock for "${item.product_name}". Available: ${currentStock}, requested: ${item.quantity}`,
            400
          );
        }

        await connection.query(
          `INSERT INTO pos_transaction_items (transaction_id, product_id, product_name, quantity, unit, unit_price, total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [transactionId, item.product_id, item.product_name, item.quantity, item.unit, item.unit_price, item.total]
        );

        // Reduce inventory — floor at 0 to be safe
        const newQty = Math.max(0, currentStock - item.quantity);
        await connection.query(
          `UPDATE inventory SET quantity = ? WHERE product_id = ? AND shop_id = ?`,
          [newQty, item.product_id, req.user.shop_id]
        );

        // Log stock movement — non-fatal, don't let a logging failure kill the sale
        try {
          const [[product]] = await connection.query(
            `SELECT user_id FROM products WHERE id = ? AND shop_id = ?`,
            [item.product_id, req.user.shop_id]
          );
          if (product) {
            const movementUserId = product.user_id || req.user.id;
            await connection.query(
              `INSERT INTO stock_movements (product_id, user_id, shop_id, type, quantity, reference_type, reference_id, notes)
               VALUES (?, ?, ?, 'out', ?, 'pos_transaction', ?, ?)`,
              [item.product_id, movementUserId, req.user.shop_id, item.quantity, transactionId, `POS Sale: ${receiptNumber}`]
            );
          }
        } catch (movErr) {
          // Log but don't rollback — the sale is valid even if movement logging fails
          require('../config/logger').warn(`Stock movement log failed for product ${item.product_id}: ${movErr.message}`);
        }
      }

      await connection.commit();

      // Broadcast stock update to other devices
      broadcastToShop(req.user.shop_id, {
        type: 'stock_update',
        items: processedItems.map(i => ({ product_id: i.product_id, quantity_sold: i.quantity })),
        receipt_number: receiptNumber,
      });

      // Send notification to customer (non-blocking)
      if (customer_id || customer_name) {
        try {
          const notificationService = require('../services/notification.service');
          // Get customer email/phone if customer_id exists
          let customerEmail = null, customerPhone = null;
          if (customer_id) {
            const [[cust]] = await pool.query('SELECT email, phone FROM customers WHERE id = ?', [customer_id]);
            if (cust) { customerEmail = cust.email; customerPhone = cust.phone; }
          }
          notificationService.sendSaleNotification(req.user.shop_id, {
            customer_id, customer_name, customer_email: customerEmail, customer_phone: customerPhone,
            receipt_number: receiptNumber, net_amount: netAmount, payment_method: resolvedPaymentMethod,
            items: processedItems,
          }).catch(err => require('../config/logger').warn(`Sale notification failed: ${err.message}`));
        } catch { /* non-fatal */ }
      }

      return ApiResponse.created(res, {
        id: transactionId,
        uuid,
        receipt_number: receiptNumber,
        biller_id: req.user.id,
        biller_name: req.user.email, // resolved to name on fetch; email as fallback here
        total_amount: totalAmount,
        discount: discountAmount,
        net_amount: netAmount,
        payment_method: resolvedPaymentMethod,
        amount_received: resolvedAmountReceived,
        change_amount: changeAmount > 0 ? changeAmount : 0,
        payments: payments || null,
        items: processedItems,
        customer_name,
        created_at: new Date().toISOString(),
      }, 'Checkout successful');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pos/transactions:
 *   get:
 *     tags: [POS]
 *     summary: Get POS transaction history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated transaction history }
 */
router.get('/transactions', authenticate, permit('pos:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);
    const { date, start_date, end_date, search } = req.query;

    let query = `SELECT t.*, u.name AS biller_name, u.email AS biller_email
                 FROM pos_transactions t
                 LEFT JOIN users u ON t.biller_id = u.id
                 WHERE t.shop_id = ?`;
    let countQuery = 'SELECT COUNT(*) as total FROM pos_transactions WHERE shop_id = ?';
    const params = [req.user.shop_id];

    if (date) {
      query += ' AND DATE(t.created_at) = ?';
      countQuery += ' AND DATE(created_at) = ?';
      params.push(date);
    } else {
      if (start_date) {
        query += ' AND DATE(t.created_at) >= ?';
        countQuery += ' AND DATE(created_at) >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND DATE(t.created_at) <= ?';
        countQuery += ' AND DATE(created_at) <= ?';
        params.push(end_date);
      }
    }

    if (search) {
      const like = `%${search}%`;
      query += ' AND (t.receipt_number LIKE ? OR t.customer_name LIKE ?)';
      countQuery += ' AND (receipt_number LIKE ? OR customer_name LIKE ?)';
      params.push(like, like);
    }

    const countParams = [...params];
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    const pagination = buildPaginationMeta(countResult[0].total, page, limit);

    return ApiResponse.paginated(res, rows, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pos/transactions/{id}:
 *   get:
 *     tags: [POS]
 *     summary: Get transaction detail with items
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Transaction with items }
 *       404: { description: Transaction not found }
 */
router.get('/transactions/:id', authenticate, permit('pos:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT t.*, u.name AS biller_name, u.email AS biller_email
       FROM pos_transactions t
       LEFT JOIN users u ON t.biller_id = u.id
       WHERE t.id = ? AND t.shop_id = ?`,
      [req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return ApiResponse.notFound(res, 'Transaction not found');

    const [items] = await pool.query(
      'SELECT * FROM pos_transaction_items WHERE transaction_id = ?',
      [req.params.id]
    );

    return ApiResponse.success(res, { ...rows[0], items });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pos/today-summary:
 *   get:
 *     tags: [POS]
 *     summary: Get today's POS summary (revenue, expenses, net)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format (defaults to today)
 *     responses:
 *       200: { description: Today's financial summary }
 */
router.get('/today-summary', authenticate, permit('pos:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const today = req.query.date || localDateStr();

    const [[sales]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(net_amount), 0) as revenue
       FROM pos_transactions WHERE shop_id = ? AND DATE(created_at) = ? AND status = 'completed'`,
      [req.user.shop_id, today]
    );

    const [[expenses]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shop_id = ? AND expense_date = ?`,
      [req.user.shop_id, today]
    );

    const [breakdown] = await pool.query(
      `SELECT payment_method,
              COUNT(*) as count,
              COALESCE(SUM(net_amount), 0) as total
       FROM pos_transactions
       WHERE shop_id = ? AND DATE(created_at) = ? AND status = 'completed'
       GROUP BY payment_method`,
      [req.user.shop_id, today]
    );

    // Build a keyed map so frontend always gets all keys
    const paymentBreakdown = { cash: 0, upi: 0, card: 0, credit: 0 };
    const paymentCounts    = { cash: 0, upi: 0, card: 0, credit: 0 };
    breakdown.forEach(row => {
      const key = row.payment_method || 'cash';
      paymentBreakdown[key] = parseFloat(row.total);
      paymentCounts[key]    = Number(row.count);
    });

    return ApiResponse.success(res, {
      total_transactions: sales.count,
      total_revenue: sales.revenue,
      total_expenses: expenses.total,
      net_income: Math.round((sales.revenue - expenses.total) * 100) / 100,
      payment_breakdown: paymentBreakdown,
      payment_counts: paymentCounts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pos/payment-summary - Payment method breakdown for a date range
 * Query params: start_date, end_date (YYYY-MM-DD)
 */
router.get('/payment-summary', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { start_date, end_date } = req.query;

    let where = 'WHERE shop_id = ? AND status = \'completed\'';
    const params = [req.user.shop_id];

    if (start_date) { where += ' AND DATE(created_at) >= ?'; params.push(start_date); }
    if (end_date)   { where += ' AND DATE(created_at) <= ?'; params.push(end_date);   }

    const [breakdown] = await pool.query(
      `SELECT payment_method,
              COUNT(*) as count,
              COALESCE(SUM(net_amount), 0) as total
       FROM pos_transactions ${where}
       GROUP BY payment_method`,
      params
    );

    const totals = { cash: 0, upi: 0, card: 0, credit: 0 };
    const counts = { cash: 0, upi: 0, card: 0, credit: 0 };
    breakdown.forEach(row => {
      const key = row.payment_method || 'cash';
      totals[key] = parseFloat(row.total);
      counts[key] = Number(row.count);
    });

    return ApiResponse.success(res, { totals, counts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
