const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId, localDateStr } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// Generate receipt number
const generateReceiptNumber = () => {
  const date = new Date();
  const prefix = 'RCP';
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${random}`;
};

/**
 * GET /api/pos/products - Get active products for POS with offers
 */
router.get('/products', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { category_id, search } = req.query;
    const today = localDateStr();

    let query = `SELECT p.id, p.name, p.selling_price, p.mrp, p.unit, p.category_id, p.barcode, p.sku,
                 p.image_url, p.brand, p.weight, c.name as category_name,
                 COALESCE(i.quantity, 0) as stock
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN inventory i ON p.id = i.product_id AND i.shop_id = p.shop_id
                 WHERE p.shop_id = ? AND p.is_active = 1`;
    const params = [req.user.shop_id];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name ASC';
    const [rows] = await pool.query(query, params);

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

    return ApiResponse.success(res, products);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pos/barcode/:code - Lookup product by barcode for quick scan
 */
router.get('/barcode/:code', authenticate, async (req, res, next) => {
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
 * POST /api/pos/checkout - Process a POS transaction
 */
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { items, customer_name, customer_id, discount, payment_method, amount_received } = req.body;

    if (!items || items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 400);
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
      const changeAmount = amount_received ? Math.round((amount_received - netAmount) * 100) / 100 : 0;

      const uuid = generateId();
      const receiptNumber = generateReceiptNumber();

      // Insert transaction
      const [txResult] = await connection.query(
        `INSERT INTO pos_transactions (uuid, user_id, shop_id, customer_name, customer_id, total_amount, discount, net_amount, payment_method, amount_received, change_amount, receipt_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, req.user.id, req.user.shop_id, customer_name || null, customer_id || null, totalAmount, discountAmount, netAmount, payment_method || 'cash', amount_received || netAmount, changeAmount > 0 ? changeAmount : 0, receiptNumber]
      );
      const transactionId = txResult.insertId;

      // Insert items and update inventory with stock validation
      for (const item of processedItems) {
        // Check current stock
        const [stockRows] = await connection.query(
          `SELECT COALESCE(quantity, 0) as quantity FROM inventory WHERE product_id = ? AND shop_id = ?`,
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

        // Log stock movement
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
      }

      await connection.commit();

      return ApiResponse.created(res, {
        id: transactionId,
        uuid,
        receipt_number: receiptNumber,
        total_amount: totalAmount,
        discount: discountAmount,
        net_amount: netAmount,
        payment_method: payment_method || 'cash',
        amount_received: amount_received || netAmount,
        change_amount: changeAmount > 0 ? changeAmount : 0,
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
 * GET /api/pos/transactions - Get POS transaction history
 */
router.get('/transactions', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);
    const { date, start_date, end_date, search } = req.query;

    let query = 'SELECT * FROM pos_transactions WHERE shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM pos_transactions WHERE shop_id = ?';
    const params = [req.user.shop_id];

    if (date) {
      query += ' AND DATE(created_at) = ?';
      countQuery += ' AND DATE(created_at) = ?';
      params.push(date);
    } else {
      if (start_date) {
        query += ' AND DATE(created_at) >= ?';
        countQuery += ' AND DATE(created_at) >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND DATE(created_at) <= ?';
        countQuery += ' AND DATE(created_at) <= ?';
        params.push(end_date);
      }
    }

    if (search) {
      const like = `%${search}%`;
      query += ' AND (receipt_number LIKE ? OR customer_name LIKE ?)';
      countQuery += ' AND (receipt_number LIKE ? OR customer_name LIKE ?)';
      params.push(like, like);
    }

    const countParams = [...params];
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
 * GET /api/pos/transactions/:id - Get transaction detail with items
 */
router.get('/transactions/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM pos_transactions WHERE id = ? AND shop_id = ?',
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
 * GET /api/pos/today-summary - Get POS summary with payment breakdown for a given date
 * Query params: date (YYYY-MM-DD, defaults to today)
 */
router.get('/today-summary', authenticate, async (req, res, next) => {
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
