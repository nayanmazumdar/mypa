import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineShieldCheck,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineXMark,
} from 'react-icons/hi2';
import { rbacApi } from '../../api/rbac.api';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  inset:  { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

const EMPTY_ROLE = { name: '', slug: '', description: '' };

export default function AdminRoles() {
  usePageTitle('Role Management');
  const { user } = useSelector((s) => s.auth);

  const [loading,    setLoading]    = useState(true);
  const [roles,      setRoles]      = useState([]);
  const [features,   setFeatures]   = useState([]);
  const [expanded,   setExpanded]   = useState(null);   // role id currently expanded
  const [rolePerms,  setRolePerms]  = useState({});     // { [roleId]: { [featureId]: {read,write,execute} } }
  const [saving,     setSaving]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editRole,   setEditRole]   = useState(null);   // null = create, object = edit
  const [form,       setForm]       = useState(EMPTY_ROLE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, featuresRes] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getFeatures(),
      ]);
      setRoles(rolesRes.data || rolesRes || []);
      setFeatures(featuresRes.data || featuresRes || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load permissions when a role is expanded
  const toggleExpand = async (role) => {
    if (expanded === role.id) { setExpanded(null); return; }
    setExpanded(role.id);
    if (rolePerms[role.id]) return; // already loaded
    try {
      const res = await rbacApi.getRoleById(role.id);
      const permsMap = {};
      for (const p of (res.data?.permissions || [])) {
        permsMap[p.feature_id] = {
          read:    !!p.can_read,
          write:   !!p.can_write,
          execute: !!p.can_execute,
        };
      }
      setRolePerms(prev => ({ ...prev, [role.id]: permsMap }));
    } catch {
      toast.error('Failed to load role permissions');
    }
  };

  const togglePerm = (roleId, featureId, flag) => {
    setRolePerms(prev => {
      const current = prev[roleId] || {};
      const feat = current[featureId] || { read: false, write: false, execute: false };
      return { ...prev, [roleId]: { ...current, [featureId]: { ...feat, [flag]: !feat[flag] } } };
    });
  };

  const savePermissions = async (roleId) => {
    setSaving(true);
    try {
      const permsMap = rolePerms[roleId] || {};
      const permissions = features.map(f => ({
        feature_id:  f.id,
        can_read:    permsMap[f.id]?.read    ? 1 : 0,
        can_write:   permsMap[f.id]?.write   ? 1 : 0,
        can_execute: permsMap[f.id]?.execute ? 1 : 0,
      }));
      await rbacApi.setRolePermissions(roleId, permissions);
      toast.success('Permissions saved');
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditRole(null);
    setForm(EMPTY_ROLE);
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditRole(role);
    setForm({ name: role.name, slug: role.slug, description: role.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      if (editRole) {
        await rbacApi.updateRole(editRole.id, form);
        toast.success('Role updated');
      } else {
        await rbacApi.createRole(form);
        toast.success('Role created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This will remove it from all assigned users.`)) return;
    try {
      await rbacApi.deleteRole(role.id);
      toast.success('Role deleted');
      load();
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const autoSlug = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineShieldCheck className="w-6 h-6 text-primary-600" />
            Role Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create roles and assign feature permissions to them.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto">
          <HiOutlinePlus className="w-4 h-4" /> New Role
        </button>
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No roles yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first role to start managing permissions</p>
          <button onClick={openCreate} className="btn-primary text-sm">Create Role</button>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl overflow-hidden" style={NEO.raised}>
              {/* Role header row */}
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                   onClick={() => toggleExpand(role)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <HiOutlineShieldCheck className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-400">{role.slug}{role.description ? ` — ${role.description}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 hidden sm:block">{role.permission_count || 0} features · {role.user_count || 0} users</span>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                  {expanded === role.id
                    ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400" />
                    : <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded permissions matrix */}
              {expanded === role.id && (
                <div className="border-t border-gray-200/60 px-5 py-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Feature Permissions</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-1/2">Feature</th>
                          <th className="text-center pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Read</th>
                          <th className="text-center pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Write</th>
                          <th className="text-center pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Execute</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.map((f) => {
                          const p = rolePerms[role.id]?.[f.id] || { read: false, write: false, execute: false };
                          return (
                            <tr key={f.id} className="border-t border-gray-100/60">
                              <td className="py-2 pr-4">
                                <p className="font-medium text-gray-700">{f.name}</p>
                                {f.description && <p className="text-[10px] text-gray-400">{f.description}</p>}
                              </td>
                              {['read', 'write', 'execute'].map((flag) => (
                                <td key={flag} className="py-2 text-center">
                                  <button
                                    onClick={() => togglePerm(role.id, f.id, flag)}
                                    className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center mx-auto
                                      ${p[flag]
                                        ? 'bg-primary-500 border-primary-500'
                                        : 'border-gray-300 bg-white'}`}>
                                    {p[flag] && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={() => savePermissions(role.id)} disabled={saving}
                      className="btn-primary text-sm px-5">
                      {saving ? 'Saving…' : 'Save Permissions'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRole ? 'Edit Role' : 'Create Role'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: editRole ? form.slug : autoSlug(e.target.value) })}
              className="input-field" placeholder="e.g. Cashier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input type="text" required value={form.slug}
              onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })}
              className="input-field font-mono text-sm" placeholder="e.g. cashier" />
            <p className="text-[11px] text-gray-400 mt-1">Lowercase letters, numbers and underscores only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="Optional short description" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
