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
 * Authorization middleware - checks if user role is in the allowed list
 * Usage: authorize('admin', 'manager')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required', action: 'login' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You do not have permission to perform this action', action: 'go_back' });
    }
    next();
  };
};

/**
 * RBAC Permission definitions
 * Defines what each role can do per module
 *
 * Roles: admin, manager, staff
 *
 * admin:   Full access (CRUD all modules, settings, staff, reports)
 * manager: Read/write operational modules, read reports, no staff/shop management
 * staff:   POS, create sales/purchases, view products/inventory/customers — no delete, no reports/settings/offers
 */
const PERMISSIONS = {
  // Products
  'products:read':    ['admin', 'manager', 'staff'],
  'products:create':  ['admin', 'manager'],
  'products:update':  ['admin', 'manager'],
  'products:delete':  ['admin'],

  // Categories
  'categories:read':   ['admin', 'manager', 'staff'],
  'categories:create': ['admin', 'manager'],
  'categories:update': ['admin', 'manager'],
  'categories:delete': ['admin'],

  // Sales
  'sales:read':   ['admin', 'manager', 'staff'],
  'sales:create': ['admin', 'manager', 'staff'],
  'sales:update': ['admin', 'manager'],
  'sales:delete': ['admin'],

  // Purchases
  'purchases:read':   ['admin', 'manager', 'staff'],
  'purchases:create': ['admin', 'manager', 'staff'],
  'purchases:update': ['admin', 'manager'],
  'purchases:delete': ['admin'],

  // Inventory
  'inventory:read':   ['admin', 'manager', 'staff'],
  'inventory:adjust': ['admin', 'manager'],

  // Customers
  'customers:read':   ['admin', 'manager', 'staff'],
  'customers:create': ['admin', 'manager', 'staff'],
  'customers:update': ['admin', 'manager'],
  'customers:delete': ['admin'],
  'customers:ledger': ['admin', 'manager'],

  // Suppliers
  'suppliers:read':   ['admin', 'manager'],
  'suppliers:create': ['admin', 'manager'],
  'suppliers:update': ['admin', 'manager'],
  'suppliers:delete': ['admin'],

  // POS
  'pos:read':     ['admin', 'manager', 'staff'],
  'pos:checkout': ['admin', 'manager', 'staff'],

  // Offers
  'offers:read':   ['admin', 'manager'],
  'offers:create': ['admin', 'manager'],
  'offers:update': ['admin', 'manager'],
  'offers:delete': ['admin'],

  // Expenses
  'expenses:read':   ['admin', 'manager'],
  'expenses:create': ['admin', 'manager'],
  'expenses:delete': ['admin'],

  // Payments
  'payments:read':   ['admin', 'manager'],
  'payments:create': ['admin', 'manager'],

  // Reports
  'reports:read': ['admin', 'manager'],

  // Invoices
  'invoices:read': ['admin', 'manager', 'staff'],

  // Shop management
  'shop:read':   ['admin', 'manager', 'staff'],
  'shop:update': ['admin'],

  // User / Staff management
  'users:read':   ['admin'],
  'users:manage': ['admin'],

  // Customer Ledger
  'customer-ledger:read':   ['admin', 'manager'],
  'customer-ledger:create': ['admin', 'manager'],
};

/**
 * Permission-based authorization middleware
 * Usage: permit('products:create')
 */
const permit = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required', action: 'login' });
    }
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      // Unknown permission — deny by default
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Permission denied', action: 'go_back' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You do not have permission to perform this action', action: 'go_back' });
    }
    next();
  };
};

module.exports = { authenticate, authorize, permit, PERMISSIONS };
