import api from './axios';

export const inventoryApi = {
  getAll: (params) => api.get('/inventory', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  addStock: (data) => api.post('/inventory/add', data),
  getHistory: (productId) => api.get(`/inventory/${productId}/history`),
  updateSettings: (productId, data) => api.put(`/inventory/${productId}/settings`, data),
  updateLevels: (data) => api.put('/inventory/levels', data),
  getReport: () => api.get('/inventory/report'),
};
