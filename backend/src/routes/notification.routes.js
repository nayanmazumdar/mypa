/**
 * notification.routes.js
 * Admin endpoints for notification settings, templates, sending, and logs.
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const notificationService = require('../services/notification.service');
const ApiResponse = require('../utils/response');

router.use(authenticate, authorize('admin'));

// ── Settings ────────────────────────────────────────────────

// GET /api/notifications/settings?shop_id=N
router.get('/settings', async (req, res, next) => {
  try {
    const shopId = parseInt(req.query.shop_id) || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    const settings = await notificationService.getSettings(shopId);
    return ApiResponse.success(res, settings);
  } catch (err) { next(err); }
});

// PUT /api/notifications/settings
router.put('/settings', async (req, res, next) => {
  try {
    const shopId = req.body.shop_id || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    await notificationService.saveSettings(shopId, req.body);
    return ApiResponse.success(res, null, 'Settings saved');
  } catch (err) { next(err); }
});

// POST /api/notifications/test-email
router.post('/test-email', async (req, res, next) => {
  try {
    const shopId = req.body.shop_id || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    await notificationService.testEmail(shopId);
    return ApiResponse.success(res, null, 'Test email sent successfully');
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
});

// ── Templates ───────────────────────────────────────────────

// GET /api/notifications/templates?shop_id=N
router.get('/templates', async (req, res, next) => {
  try {
    const shopId = parseInt(req.query.shop_id) || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    const templates = await notificationService.getTemplates(shopId);
    return ApiResponse.success(res, templates);
  } catch (err) { next(err); }
});

// PUT /api/notifications/templates
router.put('/templates', async (req, res, next) => {
  try {
    const shopId = req.body.shop_id || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    await notificationService.saveTemplate(shopId, req.body);
    return ApiResponse.success(res, null, 'Template saved');
  } catch (err) { next(err); }
});

// ── Send manually ───────────────────────────────────────────

// POST /api/notifications/send-reminder
router.post('/send-reminder', async (req, res, next) => {
  try {
    const shopId = req.body.shop_id || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    await notificationService.sendDueReminder(shopId, req.body);
    return ApiResponse.success(res, null, 'Reminder sent');
  } catch (err) { next(err); }
});

// ── Logs ────────────────────────────────────────────────────

// GET /api/notifications/logs?shop_id=N&channel=email&limit=50
router.get('/logs', async (req, res, next) => {
  try {
    const shopId = parseInt(req.query.shop_id) || req.user.shop_id;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);
    const logs = await notificationService.getLogs(shopId, {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      channel: req.query.channel || null,
      status: req.query.status || null,
    });
    return ApiResponse.success(res, logs);
  } catch (err) { next(err); }
});

module.exports = router;
