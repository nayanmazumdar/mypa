const { body } = require('express-validator');

const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('selling_price')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('purchase_price')
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number'),
  body('sku').optional({ values: 'falsy' }).trim(),
  body('barcode').optional({ values: 'falsy' }).trim(),
  body('category_id').optional({ nullable: true, values: 'falsy' }).isInt().withMessage('Category ID must be an integer'),
  body('unit').optional({ values: 'falsy' }).trim(),
  body('tax_rate').optional({ nullable: true, values: 'falsy' }).isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0-100'),
];

const updateProductValidator = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('purchase_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number'),
  body('sku').optional({ values: 'falsy' }).trim(),
  body('barcode').optional({ values: 'falsy' }).trim(),
  body('category_id').optional({ nullable: true, values: 'falsy' }).isInt().withMessage('Category ID must be an integer'),
  body('unit').optional({ values: 'falsy' }).trim(),
  body('tax_rate').optional({ nullable: true, values: 'falsy' }).isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0-100'),
];

module.exports = { createProductValidator, updateProductValidator };
