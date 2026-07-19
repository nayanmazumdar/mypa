const { body } = require('express-validator');

const createPurchaseValidator = [
  body('supplier_id').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Supplier ID must be an integer'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').optional({ nullable: true }).isInt().withMessage('Product ID must be an integer'),
  body('items.*.manual_name').optional().trim(),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be positive'),
  body('tax_amount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be positive'),
  body('paid_amount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be positive'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  body('payment_status')
    .optional()
    .isIn(['paid', 'unpaid', 'partial'])
    .withMessage('Invalid payment status'),
  body('notes').optional().trim(),
];

module.exports = { createPurchaseValidator };
