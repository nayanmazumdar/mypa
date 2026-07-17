const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// All attendance routes require admin or manager
router.post('/',       authenticate, authorize('admin', 'manager'), attendanceController.save);
router.get('/',        authenticate, authorize('admin', 'manager'), attendanceController.getAll);
router.get('/today',   authenticate, authorize('admin', 'manager'), attendanceController.getToday);

module.exports = router;
