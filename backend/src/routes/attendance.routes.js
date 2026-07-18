const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// All attendance routes require admin or manager
router.post('/',     authenticate, authorize('admin', 'manager'), attendanceController.save);
router.get('/',      authenticate, authorize('admin', 'manager'), attendanceController.getAll);
router.get('/today', authenticate, authorize('admin', 'manager'), attendanceController.getToday);

// Admin-panel route: get attendance for any owned shop without a shop-scoped token
// GET /api/attendance/admin?shop_id=N&date=YYYY-MM-DD
router.get('/admin', authenticate, authorize('admin'), attendanceController.getAllForAdmin);

module.exports = router;
