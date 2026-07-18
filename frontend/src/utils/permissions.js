/**
 * permissions.js
 *
 * Permission resolution with two-tier fallback:
 *   1. Dynamic RBAC: check rbac_perms from the Redux auth store (embedded in JWT).
 *   2. Static fallback: legacy hardcoded role→permission map (backwards-compat).
 *
 * Permission key format: "<feature_slug>:<action>"
 *   action → flag mapping:
 *     read     → read
 *     create   → write
 *     update   → write
 *     delete   → write
 *     adjust   → execute
 *     checkout → execute
 *     manage   → write
 *     ledger   → read
 */

// ─── Static fallback (legacy) ─────────────────────────────────────────────────
export const STATIC_PERMISSIONS = {
  // Dashboard
  'dashboard:read':  ['admin', 'manager', 'staff'],
  // Products
  'products:read':    ['admin', 'manager', 'staff'],
  'products:create':  ['admin', 'manager'],
  'products:update':  ['admin', 'manager'],
  'products:delete':  ['admin'],
  'categories:read':   ['admin', 'manager', 'staff'],
  'categories:create': ['admin', 'manager'],
  'categories:update': ['admin', 'manager'],
  'categories:delete': ['admin'],
  'sales:read':   ['admin', 'manager', 'staff'],
  'sales:create': ['admin', 'manager', 'staff'],
  'sales:update': ['admin', 'manager'],
  'sales:delete': ['admin'],
  'purchases:read':   ['admin', 'manager', 'staff'],
  'purchases:create': ['admin', 'manager', 'staff'],
  'purchases:update': ['admin', 'manager'],
  'purchases:delete': ['admin'],
  'inventory:read':   ['admin', 'manager', 'staff'],
  'inventory:adjust': ['admin', 'manager'],
  'customers:read':   ['admin', 'manager', 'staff'],
  'customers:create': ['admin', 'manager', 'staff'],
  'customers:update': ['admin', 'manager'],
  'customers:delete': ['admin'],
  'customers:ledger': ['admin', 'manager'],
  'suppliers:read':   ['admin', 'manager'],
  'suppliers:create': ['admin', 'manager'],
  'suppliers:update': ['admin', 'manager'],
  'suppliers:delete': ['admin'],
  'pos:read':     ['admin', 'manager', 'staff'],
  'pos:checkout': ['admin', 'manager', 'staff'],
  'offers:read':   ['admin', 'manager'],
  'offers:create': ['admin', 'manager'],
  'offers:update': ['admin', 'manager'],
  'offers:delete': ['admin'],
  'expenses:read':   ['admin', 'manager'],
  'expenses:create': ['admin', 'manager'],
  'expenses:delete': ['admin'],
  'payments:read':   ['admin', 'manager'],
  'payments:create': ['admin', 'manager'],
  'reports:read': ['admin', 'manager'],
  'invoices:read': ['admin', 'manager', 'staff'],
  'shop:read':   ['admin', 'manager', 'staff'],
  'shop:update': ['admin'],
  'users:read':   ['admin'],
  'users:manage': ['admin'],
  'customer-ledger:read':   ['admin', 'manager'],
  'customer-ledger:create': ['admin', 'manager'],
  'subscription:read':   ['admin', 'manager', 'staff'],
  'subscription:manage': ['admin'],
};

// Maps a permission action word to the rbac flag it corresponds to
const ACTION_FLAG = {
  read:     'read',
  create:   'write',
  update:   'write',
  delete:   'write',
  adjust:   'execute',
  checkout: 'execute',
  manage:   'write',
  ledger:   'read',
};

/**
 * Check if a user object has a specific permission.
 *
 * @param {object} user - Redux auth.user (must include role, rbac_perms)
 * @param {string} permission - e.g. "products:create"
 * @returns {boolean}
 */
export function hasPermission(userOrRole, permission) {
  // Support legacy call: hasPermission('admin', 'products:read')
  if (typeof userOrRole === 'string') {
    const role = userOrRole;
    // Admin always has full access
    if (role === 'admin') return true;
    const allowedRoles = STATIC_PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
  }

  const user = userOrRole;

  // Admin role = full access to everything
  if (user?.role === 'admin') return true;

  const rbacPerms = user?.rbac_perms || {};

  // ── 1. Dynamic RBAC ────────────────────────────────────────────
  if (Object.keys(rbacPerms).length > 0) {
    const [featureSlug, action] = permission.split(':');
    // Normalise slug: "customer-ledger" → "customer_ledger"
    const slug = featureSlug.replace(/-/g, '_');
    const flag = ACTION_FLAG[action] || 'read';
    return !!rbacPerms[slug]?.[flag];
  }

  // ── 2. Static fallback ─────────────────────────────────────────
  const role = user?.role || 'staff';
  const allowedRoles = STATIC_PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if a user can access a specific nav route.
 */
export function canAccessRoute(userOrRole, path) {
  const routePermissions = {
    '/dashboard': 'dashboard:read',
    '/pos':        'pos:read',
    '/products':   'products:read',
    '/offers':     'offers:read',
    '/sales':      'sales:read',
    '/purchases':  'purchases:read',
    '/inventory':  'inventory:read',
    '/customers':  'customers:read',
    '/suppliers':  'suppliers:read',
    '/accounts':   'expenses:read',
    '/reports':    'reports:read',
  };
  const permission = routePermissions[path];
  if (!permission) return true;
  return hasPermission(userOrRole, permission);
}

export default STATIC_PERMISSIONS;

/**
 * Determine the first accessible route for a user after login/shop-selection.
 * Checks dynamic RBAC permissions; lands on first permitted route.
 */
export function getFirstAccessibleRoute(user) {
  const routeChecks = [
    { path: '/dashboard', permission: 'dashboard:read' },
    { path: '/pos',       permission: 'pos:read' },
    { path: '/products',  permission: 'products:read' },
    { path: '/sales',     permission: 'sales:read' },
    { path: '/purchases', permission: 'purchases:read' },
    { path: '/inventory', permission: 'inventory:read' },
    { path: '/customers', permission: 'customers:read' },
    { path: '/suppliers', permission: 'suppliers:read' },
    { path: '/accounts',  permission: 'expenses:read' },
    { path: '/reports',   permission: 'reports:read' },
  ];

  // If user has a default_module preference, try that first
  if (user?.default_module) {
    const moduleRoutes = {
      dashboard: '/dashboard', pos: '/pos', products: '/products',
      sales: '/sales', purchases: '/purchases', inventory: '/inventory',
      customers: '/customers', accounts: '/accounts',
    };
    const preferred = moduleRoutes[user.default_module];
    if (preferred) {
      const check = routeChecks.find(r => r.path === preferred);
      if (check && hasPermission(user, check.permission)) {
        return preferred;
      }
    }
  }

  // Find the first route the user has permission for
  for (const { path, permission } of routeChecks) {
    if (hasPermission(user, permission)) {
      return path;
    }
  }

  // Absolute fallback (user has no permissions at all — shouldn't happen)
  return '/pos';
}
