import api from './axios';

export const purchaseApi = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  updateStatus: (id, status) => api.patch(`/purchases/${id}/status`, { status }),
};
