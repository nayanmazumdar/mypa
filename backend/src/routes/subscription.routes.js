const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { subscribeValidator } = require('../validators/subscription.validator');

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all available subscription plans
 *     security: []
 *     responses:
 *       200: { description: List of plans }
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current shop's active subscription
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current subscription or null }
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/subscriptions/history:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription history for the shop
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Subscription history }
 */
router.get('/history', authenticate, subscriptionController.getHistory);

/**
 * @swagger
 * /api/subscriptions/limits:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Check current usage against plan limits
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usage limits }
 */
router.get('/limits', authenticate, subscriptionController.getLimits);

/**
 * @swagger
 * /api/subscriptions/check-feature/{feature}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Check if a feature is available on current plan
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: feature
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Feature availability }
 */
router.get('/check-feature/:feature', authenticate, subscriptionController.checkFeature);

/**
 * @swagger
 * /api/subscriptions/subscribe:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Subscribe shop to a plan
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan_id, billing_cycle]
 *             properties:
 *               plan_id: { type: integer, example: 2 }
 *               billing_cycle: { type: string, enum: [monthly, quarterly, yearly] }
 *               payment_reference: { type: string, example: "pay_abc123" }
 *     responses:
 *       201: { description: Subscription created }
 */
router.post('/subscribe', authenticate, authorize('admin'), validate(subscribeValidator), subscriptionController.subscribe);

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel active subscription
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Subscription cancelled }
 */
router.post('/cancel', authenticate, authorize('admin'), subscriptionController.cancel);

module.exports = router;
