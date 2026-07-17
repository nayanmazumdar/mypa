const express = require('express');
const router = express.Router();
const loginLogController = require('../controllers/loginLog.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /api/login-logs?date=YYYY-MM-DD  — admin only
router.get('/', authenticate, authorize('admin'), loginLogController.getLogs);

// POST /api/login-logs/logout  — any authenticated user (records their own logout)
router.post('/logout', authenticate, loginLogController.logout);

module.exports = router;
