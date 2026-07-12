const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits'),
  body('shop_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Shop name must be under 200 characters'),
];

const loginValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .optional()
    .notEmpty().withMessage('Password cannot be empty'),
  body('passcode')
    .optional()
    .matches(/^\d{4}$/).withMessage('Passcode must be 4 digits'),
  body().custom((value) => {
    if (!value.password && !value.passcode) {
      throw new Error('Either password or passcode is required');
    }
    return true;
  }),
];

module.exports = { registerValidator, loginValidator };
