const express = require('express');
const router = express.Router();
const individualController = require('../controllers/individual.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { expenseValidator, incomeValidator, taskValidator } = require('../validators/individual.validator');

// All routes require authentication and individual role
router.use(authenticate);
router.use(authorize('individual'));

// Dashboard summary
router.get('/dashboard', individualController.getDashboard);

// Personal expenses
router.get('/expenses', individualController.getExpenses);
router.post('/expenses', validate(expenseValidator), individualController.createExpense);
router.put('/expenses/:id', validate(expenseValidator), individualController.updateExpense);
router.delete('/expenses/:id', individualController.deleteExpense);

// Personal incomes
router.get('/incomes', individualController.getIncomes);
router.post('/incomes', validate(incomeValidator), individualController.createIncome);
router.put('/incomes/:id', validate(incomeValidator), individualController.updateIncome);
router.delete('/incomes/:id', individualController.deleteIncome);

// Personal tasks
router.get('/tasks', individualController.getTasks);
router.post('/tasks', validate(taskValidator), individualController.createTask);
router.put('/tasks/:id', validate(taskValidator), individualController.updateTask);
router.delete('/tasks/:id', individualController.deleteTask);

// Transaction report
router.get('/report', individualController.getReport);

module.exports = router;
