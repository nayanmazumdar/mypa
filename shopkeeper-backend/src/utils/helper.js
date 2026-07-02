const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID
 */
const generateId = () => uuidv4();

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Generate invoice number
 */
const generateInvoiceNumber = (prefix = 'INV') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = { generateId, formatDate, generateInvoiceNumber };
