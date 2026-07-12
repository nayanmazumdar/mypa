import api from './axios';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  chooseRole: (role) => api.post('/auth/choose-role', { role }),
  // formData must be a FormData instance (handles multipart/avatar upload)
  updateProfile: (formData) =>
    api.put('/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
