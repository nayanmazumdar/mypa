import api from './axios';

export const inventoryApi = {
  getAll: (params) => api.get('/inventory', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  addStock: (data) => api.post('/inventory/add', data),
  updateLevels: (data) => api.put('/inventory/levels', data),
  getReport: () => api.get('/inventory/report'),
};
