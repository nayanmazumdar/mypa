/**
 * rbac.controller.js
 * Simplified — no shop scoping. Roles are global.
 */
const rbacService = require('../services/rbac.service');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');

class RbacController {

  // ── FEATURES ──────────────────────────────────

  async getFeatures(req, res) {
    try {
      const features = await rbacService.getFeatures();
      return ApiResponse.success(res, features);
    } catch (err) {
      logger.error('getFeatures error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async createFeature(req, res) {
    try {
      const feature = await rbacService.createFeature(req.body);
      return ApiResponse.created(res, feature, 'Feature created');
    } catch (err) {
      logger.error('createFeature error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async updateFeature(req, res) {
    try {
      await rbacService.updateFeature(req.params.id, req.body);
      return ApiResponse.success(res, null, 'Feature updated');
    } catch (err) {
      logger.error('updateFeature error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async deleteFeature(req, res) {
    try {
      await rbacService.deleteFeature(req.params.id);
      return ApiResponse.success(res, null, 'Feature deleted');
    } catch (err) {
      logger.error('deleteFeature error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  // ── ROLES ─────────────────────────────────────

  async getRoles(req, res) {
    try {
      const roles = await rbacService.getRoles();
      return ApiResponse.success(res, roles);
    } catch (err) {
      logger.error('getRoles error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async getRoleById(req, res) {
    try {
      const role = await rbacService.getRoleById(req.params.id);
      return ApiResponse.success(res, role);
    } catch (err) {
      logger.error('getRoleById error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async createRole(req, res) {
    try {
      const role = await rbacService.createRole(req.body);
      return ApiResponse.created(res, role, 'Role created');
    } catch (err) {
      logger.error('createRole error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async updateRole(req, res) {
    try {
      await rbacService.updateRole(req.params.id, req.body);
      return ApiResponse.success(res, null, 'Role updated');
    } catch (err) {
      logger.error('updateRole error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async deleteRole(req, res) {
    try {
      await rbacService.deleteRole(req.params.id);
      return ApiResponse.success(res, null, 'Role deleted');
    } catch (err) {
      logger.error('deleteRole error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  // ── ROLE PERMISSIONS ──────────────────────────

  async setRolePermissions(req, res) {
    try {
      const { permissions } = req.body;
      await rbacService.setRolePermissions(req.params.id, permissions);
      return ApiResponse.success(res, null, 'Permissions saved');
    } catch (err) {
      logger.error('setRolePermissions error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async upsertRolePermission(req, res) {
    try {
      const { feature_id, can_read, can_write, can_execute } = req.body;
      await rbacService.upsertRolePermission(req.params.id, feature_id, {
        canRead: can_read, canWrite: can_write, canExecute: can_execute,
      });
      return ApiResponse.success(res, null, 'Permission updated');
    } catch (err) {
      logger.error('upsertRolePermission error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  // ── USER ROLES ────────────────────────────────

  async getUserRoles(req, res) {
    try {
      const roles = await rbacService.getUserRoles(req.params.userId);
      return ApiResponse.success(res, roles);
    } catch (err) {
      logger.error('getUserRoles error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async assignRolesToUser(req, res) {
    try {
      const { role_ids } = req.body;
      if (!Array.isArray(role_ids)) return ApiResponse.error(res, 'role_ids must be an array', 400);
      await rbacService.assignRolesToUser(req.params.userId, role_ids, req.user.id);
      return ApiResponse.success(res, null, 'Roles assigned');
    } catch (err) {
      logger.error('assignRolesToUser error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  async removeRoleFromUser(req, res) {
    try {
      await rbacService.removeRoleFromUser(req.params.userId, req.params.roleId);
      return ApiResponse.success(res, null, 'Role removed from user');
    } catch (err) {
      logger.error('removeRoleFromUser error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }

  // ── RESOLVED PERMISSIONS (current user) ───────

  async getMyPermissions(req, res) {
    try {
      const result = await rbacService.resolveUserPermissions(req.user.id);
      return ApiResponse.success(res, result);
    } catch (err) {
      logger.error('getMyPermissions error:', err.message);
      return ApiResponse.error(res, err.message, err.statusCode || 500);
    }
  }
}

module.exports = new RbacController();
