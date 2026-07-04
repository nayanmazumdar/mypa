const logger = require('../config/logger');
const config = require('../config/env');

/**
 * Error codes mapped to user-friendly messages and HTTP status codes.
 * Frontend uses the `code` field to show contextual UI.
 */
const ERROR_MAP = {
  // Auth errors
  AUTH_REQUIRED: { status: 401, message: 'Please login to continue' },
  TOKEN_EXPIRED: { status: 401, message: 'Your session has expired. Please login again.' },
  TOKEN_INVALID: { status: 401, message: 'Invalid authentication. Please login again.' },
  FORBIDDEN: { status: 403, message: 'You do not have permission to perform this action.' },

  // Validation errors
  VALIDATION_FAILED: { status: 400, message: 'Please check your input and try again.' },
  INVALID_INPUT: { status: 400, message: 'The provided data is invalid.' },

  // Resource errors
  NOT_FOUND: { status: 404, message: 'The requested resource was not found.' },
  DUPLICATE: { status: 409, message: 'This record already exists.' },
  CONFLICT: { status: 409, message: 'This action conflicts with existing data.' },

  // Rate limiting
  RATE_LIMITED: { status: 429, message: 'Too many requests. Please wait and try again.' },

  // Server errors
  INTERNAL: { status: 500, message: 'Something went wrong on our end. Please try again.' },
  DB_ERROR: { status: 500, message: 'A database error occurred. Please try again.' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable. Please try again shortly.' },
};

/**
 * Create a structured application error
 */
class AppError extends Error {
  constructor(code, details = null, originalError = null) {
    const mapped = ERROR_MAP[code] || ERROR_MAP.INTERNAL;
    super(mapped.message);
    this.code = code;
    this.statusCode = mapped.status;
    this.details = details;
    this.originalError = originalError;
    this.isOperational = true;
  }
}

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  if (config.nodeEnv === 'production' && !req.path.startsWith('/api/')) {
    return next();
  }
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    action: 'check_url',
  });
};

/**
 * Global error handler — sends structured, actionable error responses
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with context
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || null,
    errorCode: err.code || 'UNKNOWN',
  };

  if (err.statusCode >= 500 || !err.statusCode) {
    logger.error(err.message, { ...logContext, stack: err.stack });
  } else {
    logger.warn(err.message, logContext);
  }

  // If it's our structured AppError, use it directly
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details || undefined,
      action: getActionForCode(err.code),
    });
  }

  // Map known error types
  let statusCode = err.statusCode || err.status || 500;
  let code = 'INTERNAL';
  let message = 'Something went wrong. Please try again.';
  let details = null;
  let action = 'retry';

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401; code = 'TOKEN_INVALID'; message = 'Invalid authentication token.'; action = 'login';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401; code = 'TOKEN_EXPIRED'; message = 'Your session has expired.'; action = 'login';
  }

  // MySQL errors
  else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409; code = 'DUPLICATE';
    const match = err.message.match(/Duplicate entry '(.+)' for key/);
    message = match ? `"${match[1]}" already exists.` : 'This record already exists.';
    action = 'fix_input';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400; code = 'INVALID_INPUT';
    message = 'Referenced record does not exist.'; action = 'fix_input';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400; code = 'CONFLICT';
    message = 'Cannot delete — this record is used by other data.'; action = 'none';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    statusCode = 503; code = 'SERVICE_UNAVAILABLE';
    message = 'Database connection lost. Please try again.'; action = 'retry';
  }

  // Validation errors from express-validator
  else if (err.type === 'entity.parse.failed') {
    statusCode = 400; code = 'INVALID_INPUT'; message = 'Invalid JSON in request body.'; action = 'fix_input';
  }

  // Custom statusCode on error object
  else if (err.statusCode && err.statusCode < 500) {
    statusCode = err.statusCode;
    code = statusCode === 401 ? 'AUTH_REQUIRED' : statusCode === 403 ? 'FORBIDDEN' : 'INVALID_INPUT';
    message = err.message;
    action = getActionForCode(code);
  }

  // Hide internal details in production
  if (statusCode >= 500 && config.nodeEnv === 'production') {
    message = 'Something went wrong on our end. Please try again.';
  } else if (statusCode >= 500) {
    details = err.message;
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details || undefined,
    action,
    ...(config.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
};

/**
 * Map error codes to frontend actions
 */
function getActionForCode(code) {
  const actionMap = {
    AUTH_REQUIRED: 'login',
    TOKEN_EXPIRED: 'login',
    TOKEN_INVALID: 'login',
    FORBIDDEN: 'go_back',
    VALIDATION_FAILED: 'fix_input',
    INVALID_INPUT: 'fix_input',
    NOT_FOUND: 'go_back',
    DUPLICATE: 'fix_input',
    CONFLICT: 'none',
    RATE_LIMITED: 'wait',
    INTERNAL: 'retry',
    DB_ERROR: 'retry',
    SERVICE_UNAVAILABLE: 'retry',
  };
  return actionMap[code] || 'retry';
}

module.exports = { notFoundHandler, errorHandler, AppError, ERROR_MAP };
