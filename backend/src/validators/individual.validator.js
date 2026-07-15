const { body } = require('express-validator');

const expenseValidator = [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('amount')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('expense_date')
    .isISO8601().withMessage('Valid expense date is required (YYYY-MM-DD)'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('description').optional().trim(),
  body('notes').optional().trim(),
];

const incomeValidator = [
  body('source').trim().notEmpty().withMessage('Income source is required'),
  body('amount')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('income_date')
    .isISO8601().withMessage('Valid income date is required (YYYY-MM-DD)'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('description').optional().trim(),
  body('notes').optional().trim(),
];

const taskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ max: 255 }).withMessage('Title must be under 255 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid date (YYYY-MM-DD)'),
  body('description').optional().trim(),
];

const budgetValidator = [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('monthly_limit')
    .isFloat({ min: 0 }).withMessage('Monthly limit must be a non-negative number'),
  body('year')
    .isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid 4-digit year'),
  body('month')
    .isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
];

module.exports = { expenseValidator, incomeValidator, taskValidator, budgetValidator };
