const logger = require('../config/logger');
const ApiResponse = require('../utils/response');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, _next) => {
  logger.error(err.stack || err.message);

  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, 'Validation Error', 400, err.errors);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return ApiResponse.error(res, 'Duplicate entry', 409);
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFoundHandler };
