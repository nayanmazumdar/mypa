const { verifyToken } = require('../utils/jwt');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

/**
 * Authenticate JWT token
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error.message);
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Authorize by role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    }
    next();
  };
};

module.exports = { authenticate, authorize };
