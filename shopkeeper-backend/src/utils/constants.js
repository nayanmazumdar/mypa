module.exports = {
  ROLES: {
    ADMIN: 'admin',
    SHOPKEEPER: 'shopkeeper',
    STAFF: 'staff',
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
