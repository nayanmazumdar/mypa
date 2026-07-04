const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  BUSINESS_OWNER: 'business_owner',
  STAFF: 'staff',
};

// All business routes require authentication
router.use(authenticateJWT);

// GET /api/business — list (admin: all, business_owner: own)
router.get(
  '/',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BUSINESS_OWNER),
  businessController.getAll
);

// POST /api/business — create business for logged-in BUSINESS_OWNER
router.post(
  '/',
  authorizeRoles(ROLES.BUSINESS_OWNER),
  businessController.create
);

// GET /api/business/dashboard — today's stats, outstanding, subscription
// Must be defined before /:id to avoid route conflict
router.get(
  '/dashboard',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BUSINESS_OWNER, ROLES.STAFF),
  businessController.getDashboard
);

// GET /api/business/statistics — monthly sales chart, top 5 customers
router.get(
  '/statistics',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BUSINESS_OWNER, ROLES.STAFF),
  businessController.getStatistics
);

// PUT /api/business/:id — update (owner or admin)
router.put(
  '/:id',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BUSINESS_OWNER),
  businessController.update
);

// DELETE /api/business/:id — admin only
router.delete(
  '/:id',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  businessController.delete
);

module.exports = router;
