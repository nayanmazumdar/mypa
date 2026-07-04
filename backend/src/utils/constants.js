module.exports = {
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    BUSINESS_OWNER: 'business_owner',
    STAFF: 'staff',
    CUSTOMER: 'customer',
    SHOPKEEPER: 'shopkeeper', // keep backward compat
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  PAYMENT_STATUS: {
    PAID: 'paid',
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
  },

  PAYMENT_METHOD: {
    CASH: 'cash',
    CARD: 'card',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
  },

  STOCK_MOVEMENT: {
    IN: 'in',
    OUT: 'out',
    ADJUSTMENT: 'adjustment',
  },
};
