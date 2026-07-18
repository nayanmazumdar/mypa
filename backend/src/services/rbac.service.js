/**
 * rbac.service.js
 * Dynamic RBAC — simplified:
 *   - Features: global capabilities (products, pos, sales, etc.)
 *   - Roles: named permission bundles (Cashier, Manager, etc.)
 *   - Role-Permissions: which features a role grants (read/write/execute)
 *   - User-Roles: assign roles to users
 *   - No shop scoping — roles are global, applied everywhere.
 */
const { getPool } = require('../config/db');
const logger = require('../config/logger');

class RbacService {
  // ─── FEATURES ─────────────────────────────────────────────

  async getFeatures() {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM rbac_features WHERE is_active = 1 AND is_admin_only = 0 ORDER BY category ASC, name ASC'
    );
    return rows;
  }

  async createFeature({ name, slug, description, canRead = 1, canWrite = 1, canExecute = 1 }) {
    const pool = getPool();
    slug = slug || name.toLowerCase().replace(/\s+/g, '_');
    const [result] = await pool.query(
      'INSERT INTO rbac_features (name, slug, description, can_read, can_write, can_execute) VALUES (?,?,?,?,?,?)',
      [name, slug, description || null, canRead, canWrite, canExecute]
    );
    logger.info(`RBAC feature created: ${slug} (id: ${result.insertId})`);
    return { id: result.insertId, name, slug, description };
  }

  async updateFeature(id, { name, slug, description, canRead, canWrite, canExecute, isActive }) {
    const pool = getPool();
    const fields = [];
    const vals = [];
    if (name        !== undefined) { fields.push('name=?');        vals.push(name); }
    if (slug        !== undefined) { fields.push('slug=?');        vals.push(slug); }
    if (description !== undefined) { fields.push('description=?'); vals.push(description); }
    if (canRead     !== undefined) { fields.push('can_read=?');    vals.push(canRead ? 1 : 0); }
    if (canWrite    !== undefined) { fields.push('can_write=?');   vals.push(canWrite ? 1 : 0); }
    if (canExecute  !== undefined) { fields.push('can_execute=?'); vals.push(canExecute ? 1 : 0); }
    if (isActive    !== undefined) { fields.push('is_active=?');   vals.push(isActive ? 1 : 0); }
    if (!fields.length) throw Object.assign(new Error('Nothing to update'), { statusCode: 400 });
    vals.push(id);
    await pool.query(`UPDATE rbac_features SET ${fields.join(',')} WHERE id=?`, vals);
  }

  async deleteFeature(id) {
    const pool = getPool();
    await pool.query('DELETE FROM rbac_features WHERE id=?', [id]);
  }

  // ─── ROLES ────────────────────────────────────────────────

  async getRoles() {
    const pool = getPool();
    const [roles] = await pool.query(
      `SELECT r.*,
              COUNT(DISTINCT rp.feature_id) AS permission_count,
              COUNT(DISTINCT ur.user_id)    AS user_count
       FROM rbac_roles r
       LEFT JOIN rbac_role_permissions rp ON rp.role_id = r.id
       LEFT JOIN rbac_user_roles ur ON ur.role_id = r.id
       WHERE r.is_active = 1
       GROUP BY r.id
       ORDER BY r.name ASC`
    );
    return roles;
  }

  async getRoleById(id) {
    const pool = getPool();
    const [[role]] = await pool.query('SELECT * FROM rbac_roles WHERE id=?', [id]);
    if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
    const [permissions] = await pool.query(
      `SELECT rp.*, f.name AS feature_name, f.slug AS feature_slug
       FROM rbac_role_permissions rp
       JOIN rbac_features f ON f.id = rp.feature_id
       WHERE rp.role_id = ?`,
      [id]
    );
    return { ...role, permissions };
  }

  async createRole({ name, slug, description }) {
    const pool = getPool();
    slug = slug || name.toLowerCase().replace(/\s+/g, '_');
    const [[exists]] = await pool.query('SELECT id FROM rbac_roles WHERE slug=?', [slug]);
    if (exists) throw Object.assign(new Error('A role with this slug already exists'), { statusCode: 409 });
    const [result] = await pool.query(
      'INSERT INTO rbac_roles (name, slug, description) VALUES (?,?,?)',
      [name, slug, description || null]
    );
    logger.info(`RBAC role created: ${slug} (id: ${result.insertId})`);
    return { id: result.insertId, name, slug, description };
  }

  async updateRole(id, { name, slug, description, isActive }) {
    const pool = getPool();
    const fields = [];
    const vals = [];
    if (name        !== undefined) { fields.push('name=?');        vals.push(name); }
    if (slug        !== undefined) { fields.push('slug=?');        vals.push(slug); }
    if (description !== undefined) { fields.push('description=?'); vals.push(description); }
    if (isActive    !== undefined) { fields.push('is_active=?');   vals.push(isActive ? 1 : 0); }
    if (!fields.length) throw Object.assign(new Error('Nothing to update'), { statusCode: 400 });
    vals.push(id);
    await pool.query(`UPDATE rbac_roles SET ${fields.join(',')} WHERE id=?`, vals);
  }

  async deleteRole(id) {
    const pool = getPool();
    await pool.query('DELETE FROM rbac_roles WHERE id=?', [id]);
    logger.info(`RBAC role deleted: id=${id}`);
  }

  // ─── ROLE PERMISSIONS ─────────────────────────────────────

  /**
   * Full replace: set ALL permissions for a role.
   * permissions = [{ feature_id, can_read, can_write, can_execute }, ...]
   */
  async setRolePermissions(roleId, permissions) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM rbac_role_permissions WHERE role_id=?', [roleId]);
      if (permissions && permissions.length) {
        const rows = permissions.map(p => [
          roleId, p.feature_id, p.can_read ? 1 : 0, p.can_write ? 1 : 0, p.can_execute ? 1 : 0,
        ]);
        await conn.query(
          'INSERT INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute) VALUES ?',
          [rows]
        );
      }
      await conn.commit();
      logger.info(`RBAC permissions set for role ${roleId}: ${permissions?.length || 0} entries`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async upsertRolePermission(roleId, featureId, { canRead, canWrite, canExecute }) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE can_read=VALUES(can_read), can_write=VALUES(can_write), can_execute=VALUES(can_execute)`,
      [roleId, featureId, canRead ? 1 : 0, canWrite ? 1 : 0, canExecute ? 1 : 0]
    );
  }

  // ─── USER ROLES ───────────────────────────────────────────

  async getUserRoles(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ur.*, r.name AS role_name, r.slug AS role_slug, r.description AS role_description
       FROM rbac_user_roles ur
       JOIN rbac_roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return rows;
  }

  async assignRolesToUser(userId, roleIds, assignedBy) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM rbac_user_roles WHERE user_id=?', [userId]);
      if (roleIds && roleIds.length) {
        const rows = roleIds.map(rid => [userId, rid, assignedBy || null]);
        await conn.query(
          'INSERT INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES ?',
          [rows]
        );
      }
      await conn.commit();
      logger.info(`RBAC roles assigned to user ${userId}: [${roleIds?.join(',') || ''}]`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async removeRoleFromUser(userId, roleId) {
    const pool = getPool();
    await pool.query('DELETE FROM rbac_user_roles WHERE user_id=? AND role_id=?', [userId, roleId]);
  }

  // ─── PERMISSION RESOLUTION ────────────────────────────────

  /**
   * Resolve all permissions for a user by combining all their roles.
   * Returns: { permissions: { [slug]: { read, write, execute } }, roles: [slug, ...] }
   */
  async resolveUserPermissions(userId) {
    const pool = getPool();
    const [roles] = await pool.query(
      `SELECT DISTINCT r.id, r.slug, r.name
       FROM rbac_user_roles ur
       JOIN rbac_roles r ON r.id = ur.role_id AND r.is_active = 1
       WHERE ur.user_id = ?`,
      [userId]
    );
    if (!roles.length) return { permissions: {}, roles: [] };

    const roleIds = roles.map(r => r.id);
    const [perms] = await pool.query(
      `SELECT f.slug,
              MAX(rp.can_read)    AS can_read,
              MAX(rp.can_write)   AS can_write,
              MAX(rp.can_execute) AS can_execute
       FROM rbac_role_permissions rp
       JOIN rbac_features f ON f.id = rp.feature_id AND f.is_active = 1
       WHERE rp.role_id IN (${roleIds.map(() => '?').join(',')})
       GROUP BY f.slug`,
      roleIds
    );

    const permissions = {};
    for (const p of perms) {
      permissions[p.slug] = {
        read:    !!p.can_read,
        write:   !!p.can_write,
        execute: !!p.can_execute,
      };
    }
    return { permissions, roles: roles.map(r => r.slug) };
  }
}

module.exports = new RbacService();
