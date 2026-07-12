const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID
 */
const generateId = () => uuidv4();

/**
 * Format date to YYYY-MM-DD using LOCAL time (not UTC).
 * Prevents off-by-one errors in IST and other UTC+ timezones where
 * new Date().toISOString() returns yesterday's date before midnight UTC.
 */
const localDateStr = (date = new Date()) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Generate invoice number
 */
const generateInvoiceNumber = (prefix = 'INV') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = { generateId, localDateStr, generateInvoiceNumber };
