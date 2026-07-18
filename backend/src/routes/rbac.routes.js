/**
 * rbac.routes.js
 * All routes require authentication.
 * Management endpoints (create/update/delete) additionally require admin role.
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const rbacController = require('../controllers/rbac.controller');

// All routes require a valid JWT
router.use(authenticate);

// ── Current user's resolved permissions ──────────────────
// Any authenticated user can fetch their own merged permission set
router.get('/my-permissions', rbacController.getMyPermissions);

// ── Features ─────────────────────────────────────────────
router.get('/features',       rbacController.getFeatures);
router.post('/features',      authorize('admin'), rbacController.createFeature);
router.put('/features/:id',   authorize('admin'), rbacController.updateFeature);
router.delete('/features/:id',authorize('admin'), rbacController.deleteFeature);

// ── Roles ─────────────────────────────────────────────────
router.get('/roles',          rbacController.getRoles);
router.get('/roles/:id',      rbacController.getRoleById);
router.post('/roles',         authorize('admin'), rbacController.createRole);
router.put('/roles/:id',      authorize('admin'), rbacController.updateRole);
router.delete('/roles/:id',   authorize('admin'), rbacController.deleteRole);

// ── Role ↔ Feature permissions ────────────────────────────
// Full replace: PUT /roles/:id/permissions  body: { permissions: [...] }
router.put('/roles/:id/permissions',    authorize('admin'), rbacController.setRolePermissions);
// Patch one feature: PATCH /roles/:id/permissions  body: { feature_id, can_read, can_write, can_execute }
router.patch('/roles/:id/permissions',  authorize('admin'), rbacController.upsertRolePermission);

// ── User ↔ Role assignment ────────────────────────────────
router.get('/users/:userId/roles',       authorize('admin'), rbacController.getUserRoles);
router.put('/users/:userId/roles',       authorize('admin'), rbacController.assignRolesToUser);
router.delete('/users/:userId/roles/:roleId', authorize('admin'), rbacController.removeRoleFromUser);

module.exports = router;
