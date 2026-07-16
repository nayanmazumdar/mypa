const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId } = require('../utils/helper');

/**
 * @swagger
 * /api/returns:
 *   post:
 *     tags: [Returns]
 *     summary: Process a return/exchange
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', authenticate, permit('sales:update'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { transaction_id, items, reason, type } = req.body;
    // type = 'return' or 'exchange'

    if (!transaction_id || !items || items.length === 0) {
      return ApiResponse.error(res, 'Transaction ID and items are required', 400);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify original transaction belongs to this shop
      const [[txn]] = await connection.query(
        'SELECT id, shop_id, net_amount, receipt_number FROM pos_transactions WHERE id = ? AND shop_id = ?',
        [transaction_id, req.user.shop_id]
      );
      if (!txn) {
        await connection.rollback();
        return ApiResponse.error(res, 'Transaction not found', 404);
      }

      let totalRefund = 0;
      const processedItems = [];

      for (const item of items) {
        // Verify item was part of original transaction
        const [[origItem]] = await connection.query(
          'SELECT id, product_id, product_name, quantity, unit_price FROM pos_transaction_items WHERE transaction_id = ? AND product_id = ?',
          [transaction_id, item.product_id]
        );
        if (!origItem) continue;

        const returnQty = Math.min(item.quantity, origItem.quantity);
        const refundAmount = returnQty * parseFloat(origItem.unit_price);
        totalRefund += refundAmount;

        // Restore inventory
        await connection.query(
          'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND shop_id = ?',
          [returnQty, item.product_id, req.user.shop_id]
        );

        // Log stock movement
        await connection.query(
          `INSERT INTO stock_movements (product_id, user_id, shop_id, type, quantity, reference_type, reference_id, notes)
           VALUES (?, ?, ?, 'in', ?, 'return', ?, ?)`,
          [item.product_id, req.user.id, req.user.shop_id, returnQty, transaction_id, `Return: ${reason || 'Customer return'}`]
        );

        processedItems.push({
          product_id: item.product_id,
          product_name: origItem.product_name,
          quantity: returnQty,
          unit_price: parseFloat(origItem.unit_price),
          refund_amount: refundAmount,
        });
      }

      // Create return record
      const returnUuid = generateId();
      const [returnResult] = await connection.query(
        `INSERT INTO pos_returns (uuid, shop_id, user_id, transaction_id, receipt_number, type, reason, total_refund, items_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [returnUuid, req.user.shop_id, req.user.id, transaction_id, txn.receipt_number, type || 'return', reason || null, totalRefund, JSON.stringify(processedItems)]
      );

      await connection.commit();

      return ApiResponse.created(res, {
        id: returnResult.insertId,
        uuid: returnUuid,
        transaction_id,
        receipt_number: txn.receipt_number,
        type: type || 'return',
        reason,
        total_refund: totalRefund,
        items: processedItems,
      }, `${type === 'exchange' ? 'Exchange' : 'Return'} processed successfully`);
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
 * /api/returns:
 *   get:
 *     tags: [Returns]
 *     summary: Get return/exchange history
 */
router.get('/', authenticate, permit('sales:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT r.*, u.name as processed_by
       FROM pos_returns r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.user.shop_id]
    );
    const parsed = rows.map(r => ({
      ...r,
      items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json,
    }));
    return ApiResponse.success(res, parsed);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
