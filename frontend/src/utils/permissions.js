/**
 * RBAC Permission definitions (mirrored from backend)
 * 
 * Roles: admin, manager, staff
 * 
 * admin:   Full access
 * manager: Read/write operational modules, read reports, no staff/shop management
 * staff:   POS, create sales/purchases, view products/inventory/customers
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

  // Subscriptions
  'subscription:read':   ['admin', 'manager', 'staff'],
  'subscription:manage': ['admin'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if a role can access a specific nav item
 */
export function canAccessRoute(role, path) {
  const routePermissions = {
    '/dashboard': 'products:read',
    '/pos': 'pos:read',
    '/products': 'products:read',
    '/offers': 'offers:read',
    '/sales': 'sales:read',
    '/purchases': 'purchases:read',
    '/inventory': 'inventory:read',
    '/customers': 'customers:read',
    '/suppliers': 'suppliers:read',
    '/accounts': 'expenses:read',
    '/reports': 'reports:read',
    '/subscription': 'subscription:read',
    '/settings': 'shop:read',
  };
  const permission = routePermissions[path];
  if (!permission) return true; // unknown route = allow
  return hasPermission(role, permission);
}

export default PERMISSIONS;
