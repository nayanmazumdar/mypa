import api from './axios';

export const posApi = {
  getProducts: (params) => api.get('/pos/products', { params }),
  lookupBarcode: (code) => api.get(`/pos/barcode/${code}`),
  checkout: (data) => api.post('/pos/checkout', data),
  getTransactions: (params) => api.get('/pos/transactions', { params }),
  getTransaction: (id) => api.get(`/pos/transactions/${id}`),
  getTodaySummary: () => api.get('/pos/today-summary'),
};

export const expenseApi = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
};
