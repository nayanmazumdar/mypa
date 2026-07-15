import api from './axios';

export const individualApi = {
  // Dashboard
  getDashboard: (params) => api.get('/individual/dashboard', { params }),

  // Expenses
  getExpenses: (params) => api.get('/individual/expenses', { params }),
  createExpense: (data) => api.post('/individual/expenses', data),
  updateExpense: (id, data) => api.put(`/individual/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/individual/expenses/${id}`),

  // Incomes
  getIncomes: (params) => api.get('/individual/incomes', { params }),
  createIncome: (data) => api.post('/individual/incomes', data),
  updateIncome: (id, data) => api.put(`/individual/incomes/${id}`, data),
  deleteIncome: (id) => api.delete(`/individual/incomes/${id}`),

  // Tasks
  getTasks: (params) => api.get('/individual/tasks', { params }),
  createTask: (data) => api.post('/individual/tasks', data),
  updateTask: (id, data) => api.put(`/individual/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/individual/tasks/${id}`),

  // Report
  getReport: (params) => api.get('/individual/report', { params }),

  // Monthly budgets
  getBudgets: (params) => api.get('/individual/budgets', { params }),
  upsertBudget: (data) => api.post('/individual/budgets', data),
  deleteBudget: (period, category) => api.delete(`/individual/budgets/${period}/${encodeURIComponent(category)}`),
};
