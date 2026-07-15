const individualService = require('../services/individual.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class IndividualController {
  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(req, res) {
    try {
      const { from, to } = req.query;
      const result = await individualService.getDashboardSummary(req.user.id, { from, to });
      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Individual dashboard error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Expenses ────────────────────────────────────────────────────────────────

  async getExpenses(req, res) {
    try {
      const result = await individualService.getExpenses(req.user.id, req.query);
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      logger.error('Get personal expenses error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async createExpense(req, res) {
    try {
      const result = await individualService.createExpense(req.user.id, req.body);
      return ApiResponse.created(res, result, 'Expense recorded');
    } catch (error) {
      logger.error('Create personal expense error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateExpense(req, res) {
    try {
      const result = await individualService.updateExpense(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, result, 'Expense updated');
    } catch (error) {
      logger.error('Update personal expense error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async deleteExpense(req, res) {
    try {
      await individualService.deleteExpense(req.user.id, req.params.id);
      return ApiResponse.success(res, null, 'Expense deleted');
    } catch (error) {
      logger.error('Delete personal expense error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Incomes ─────────────────────────────────────────────────────────────────

  async getIncomes(req, res) {
    try {
      const result = await individualService.getIncomes(req.user.id, req.query);
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      logger.error('Get personal incomes error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async createIncome(req, res) {
    try {
      const result = await individualService.createIncome(req.user.id, req.body);
      return ApiResponse.created(res, result, 'Income recorded');
    } catch (error) {
      logger.error('Create personal income error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateIncome(req, res) {
    try {
      const result = await individualService.updateIncome(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, result, 'Income updated');
    } catch (error) {
      logger.error('Update personal income error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async deleteIncome(req, res) {
    try {
      await individualService.deleteIncome(req.user.id, req.params.id);
      return ApiResponse.success(res, null, 'Income deleted');
    } catch (error) {
      logger.error('Delete personal income error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  async getTasks(req, res) {
    try {
      const result = await individualService.getTasks(req.user.id, req.query);
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      logger.error('Get personal tasks error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async createTask(req, res) {
    try {
      const result = await individualService.createTask(req.user.id, req.body);
      return ApiResponse.created(res, result, 'Task created');
    } catch (error) {
      logger.error('Create personal task error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async updateTask(req, res) {
    try {
      const result = await individualService.updateTask(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, result, 'Task updated');
    } catch (error) {
      logger.error('Update personal task error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async deleteTask(req, res) {
    try {
      await individualService.deleteTask(req.user.id, req.params.id);
      return ApiResponse.success(res, null, 'Task deleted');
    } catch (error) {
      logger.error('Delete personal task error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Monthly Budgets ─────────────────────────────────────────────────────────

  async getBudgets(req, res) {
    try {
      const result = await individualService.getBudgets(req.user.id, req.query);
      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Get budgets error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async upsertBudget(req, res) {
    try {
      const result = await individualService.upsertBudget(req.user.id, req.body);
      return ApiResponse.success(res, result, 'Budget saved');
    } catch (error) {
      logger.error('Upsert budget error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  async deleteBudget(req, res) {
    try {
      const category = decodeURIComponent(req.params.category);
      const period   = req.params.period;
      await individualService.deleteBudget(req.user.id, category, period);
      return ApiResponse.success(res, null, 'Budget removed');
    } catch (error) {
      logger.error('Delete budget error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }

  // ─── Report ──────────────────────────────────────────────────────────────────

  async getReport(req, res) {
    try {
      const result = await individualService.getReport(req.user.id, req.query);
      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Individual report error:', error.message);
      return ApiResponse.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new IndividualController();
