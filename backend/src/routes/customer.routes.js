const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

// All customer routes require authentication + business role
router.use(authenticateJWT);
router.use(authorizeRoles(ROLES.BUSINESS_OWNER, ROLES.STAFF));

/**
 * @swagger
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List customers with search and pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or mobile
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200: { description: Paginated list of customers }
 */
router.get('/', customerController.getAll);

/**
 * @swagger
 * /api/customers/search:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers by name or mobile
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Matching customers (max 50) }
 */
// NOTE: /search and /outstanding must be declared BEFORE /:id to avoid route conflicts
router.get('/search', customerController.search);

/**
 * @swagger
 * /api/customers/outstanding:
 *   get:
 *     tags: [Customers]
 *     summary: List all customers with outstanding balances
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Customers sorted by outstanding balance descending }
 */
router.get('/outstanding', customerController.getOutstanding);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a new customer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               alternate_mobile: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               occupation: { type: string }
 *               credit_limit: { type: number }
 *               notes: { type: string }
 *               reference_person: { type: string }
 *     responses:
 *       201: { description: Customer created }
 */
router.post('/', customerController.create);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get a single customer with outstanding balance
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Customer details with balance }
 *       404: { description: Customer not found }
 */
router.get('/:id', customerController.getById);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Customer updated }
 *       404: { description: Customer not found }
 */
router.put('/:id', customerController.update);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer (soft-delete by default)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: hard
 *         schema: { type: boolean }
 *         description: Set to true for permanent deletion
 *     responses:
 *       200: { description: Customer deleted }
 *       404: { description: Customer not found }
 */
router.delete('/:id', customerController.delete);

/**
 * @swagger
 * /api/customers/{id}/history:
 *   get:
 *     tags: [Customers]
 *     summary: Get transaction history with running balance for a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Transaction history with running balance }
 *       404: { description: Customer not found }
 */
router.get('/:id/history', customerController.getHistory);

module.exports = router;
