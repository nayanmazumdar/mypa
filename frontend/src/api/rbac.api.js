/**
 * rbac.api.js
 * RBAC is global — no shop scoping.
 */
import api from './axios';

export const rbacApi = {
  // ── Features ──────────────────────────────────
  getFeatures:   ()         => api.get('/rbac/features'),
  createFeature: (data)     => api.post('/rbac/features', data),
  updateFeature: (id, data) => api.put(`/rbac/features/${id}`, data),
  deleteFeature: (id)       => api.delete(`/rbac/features/${id}`),

  // ── Roles ─────────────────────────────────────
  getRoles:      ()         => api.get('/rbac/roles'),
  getRoleById:   (id)       => api.get(`/rbac/roles/${id}`),
  createRole:    (data)     => api.post('/rbac/roles', data),
  updateRole:    (id, data) => api.put(`/rbac/roles/${id}`, data),
  deleteRole:    (id)       => api.delete(`/rbac/roles/${id}`),

  // ── Role permissions ──────────────────────────
  setRolePermissions:   (roleId, permissions) => api.put(`/rbac/roles/${roleId}/permissions`, { permissions }),
  upsertRolePermission: (roleId, data)        => api.patch(`/rbac/roles/${roleId}/permissions`, data),

  // ── User roles ────────────────────────────────
  getUserRoles:      (userId)          => api.get(`/rbac/users/${userId}/roles`),
  assignRolesToUser: (userId, roleIds) => api.put(`/rbac/users/${userId}/roles`, { role_ids: roleIds }),
  removeRoleFromUser:(userId, roleId)  => api.delete(`/rbac/users/${userId}/roles/${roleId}`),

  // ── My permissions ────────────────────────────
  getMyPermissions: () => api.get('/rbac/my-permissions'),
};
