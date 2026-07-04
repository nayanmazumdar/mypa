const { verifyToken } = require('../utils/jwt');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');
const { ROLES } = require('../utils/constants');

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

/**
 * Check business access — verifies req.user.business_id matches the requested
 * business resource identified by req.params.businessId or req.params.id.
 *
 * Admin and super_admin roles always bypass the ownership check.
 * All other roles must have a business_id on their token that matches the
 * business id referenced in the route params.
 */
const requireBusinessAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Admins are always allowed through
    const adminRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }

    // Non-admin users must have a business_id on their account
    if (!req.user.business_id) {
      return ApiResponse.forbidden(res, 'No business associated with this account');
    }

    // Determine the target business id from route params
    // businessId takes precedence over a generic :id param
    const targetBusinessId = req.params.businessId || req.params.id;

    if (targetBusinessId) {
      // Compare as strings to avoid type mismatch between number and string
      if (String(req.user.business_id) !== String(targetBusinessId)) {
        return ApiResponse.forbidden(res, 'Access denied: you do not own this business');
      }
    }
    // If no businessId param is present (e.g. list routes), the service layer
    // should scope results by req.user.business_id — just allow through here.

    next();
  } catch (error) {
    logger.error('requireBusinessAccess error:', error.message);
    return ApiResponse.error(res, 'Internal server error');
  }
};

// Aliases for compatibility with other modules
const authenticateJWT = authenticate;
const authorizeRoles = authorize;

module.exports = { authenticate, authorize, authenticateJWT, authorizeRoles, requireBusinessAccess };
