import api from './axios';

export const subscriptionApi = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentSubscription: () => api.get('/subscriptions/current'),
  getHistory: () => api.get('/subscriptions/history'),
  getLimits: () => api.get('/subscriptions/limits'),
  checkFeature: (feature) => api.get(`/subscriptions/check-feature/${feature}`),
  subscribe: (data) => api.post('/subscriptions/subscribe', data),
  cancel: () => api.post('/subscriptions/cancel'),
};
