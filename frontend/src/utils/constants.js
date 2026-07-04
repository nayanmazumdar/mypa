export const ROLES = {
  ADMIN: 'admin',
  SHOPKEEPER: 'shopkeeper',
  STAFF: 'staff',
};

export const UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'litre', label: 'Litre' },
  { value: 'ml', label: 'ml' },
  { value: 'meter', label: 'Meter' },
  { value: 'box', label: 'Box' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'packet', label: 'Packet' },
  { value: 'bottle', label: 'Bottle' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'unpaid', label: 'Unpaid', color: 'red' },
  { value: 'partial', label: 'Partial', color: 'yellow' },
];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];
