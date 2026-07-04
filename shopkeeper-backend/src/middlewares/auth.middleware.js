const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Access token is required', action: 'login' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Invalid access token', action: 'login' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      uuid: decoded.uuid,
      email: decoded.email,
      role: decoded.role,
      shop_id: decoded.shop_id,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Session expired. Please login again.', action: 'login' });
    }
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Invalid token', action: 'login' });
  }
};

/**
 * Authorization middleware - checks user role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required', action: 'login' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Insufficient permissions', action: 'go_back' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
