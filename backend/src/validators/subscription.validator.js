const { body } = require('express-validator');

const subscribeValidator = [
  body('plan_id')
    .notEmpty().withMessage('Plan ID is required')
    .isInt({ min: 1 }).withMessage('Plan ID must be a valid integer'),
  body('billing_cycle')
    .notEmpty().withMessage('Billing cycle is required')
    .isIn(['monthly', 'quarterly', 'yearly']).withMessage('Billing cycle must be monthly, quarterly, or yearly'),
  body('payment_reference')
    .optional()
    .isString().withMessage('Payment reference must be a string'),
];

module.exports = { subscribeValidator };
