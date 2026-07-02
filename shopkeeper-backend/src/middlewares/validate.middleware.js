const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response');

/**
 * Validate request using express-validator rules
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return ApiResponse.error(res, 'Validation failed', 422, extractedErrors);
  };
};

module.exports = { validate };
