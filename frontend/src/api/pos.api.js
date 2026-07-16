import api from './axios';

export const posApi = {
  getProducts: (params) => api.get('/pos/products', { params }),
  lookupBarcode: (code) => api.get(`/pos/barcode/${code}`),
  checkout: (data, config) => api.post('/pos/checkout', data, config),
  getTransactions: (params) => api.get('/pos/transactions', { params }),
  getTransaction: (id) => api.get(`/pos/transactions/${id}`),
  getTodaySummary: (params) => api.get('/pos/today-summary', { params }),
  getPaymentSummary: (params) => api.get('/pos/payment-summary', { params }),
};

export const expenseApi = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
};

export const reportApi = {
  getToday:       ()       => api.get('/reports/today'),
  getDashboard:   ()       => api.get('/reports/dashboard'),
  getDailySales:  (date)   => api.get('/reports/daily-sales', { params: { date } }),
  getMonthlySales:(y, m)   => api.get('/reports/monthly-sales', { params: { year: y, month: m } }),
  getProfit:      (params) => api.get('/reports/profit', { params }),
};
