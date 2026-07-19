import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineShieldCheck,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { rbacApi } from '../../api/rbac.api';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
};

const EMPTY_ROLE = { name: '', slug: '', description: '' };

export default function AdminRoles() {
  usePageTitle('Role Management');

  const [loading,    setLoading]    = useState(true);
  const [roles,      setRoles]      = useState([]);
  const [features,   setFeatures]   = useState([]);
  const [expanded,   setExpanded]   = useState(null);
  const [rolePerms,  setRolePerms]  = useState({});
  const [saving,     setSaving]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editRole,   setEditRole]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_ROLE);
  const [search,     setSearch]     = useState('');

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

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const map = {};
    for (const f of features) {
      const cat = f.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(f);
    }
    return map;
  }, [features]);

  const categories = useMemo(() => Object.keys(featuresByCategory).sort(), [featuresByCategory]);

  // Load permissions when a role is expanded
  const toggleExpand = async (role) => {
    if (expanded === role.id) { setExpanded(null); return; }
    setExpanded(role.id);
    if (rolePerms[role.id]) return;
    try {
      const res = await rbacApi.getRoleById(role.id);
      const data = res.data || res;
      const permsMap = {};
      for (const p of (data?.permissions || [])) {
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

  // Select/deselect all in a category
  const toggleCategory = (roleId, categoryFeatures, flag) => {
    const current = rolePerms[roleId] || {};
    const allSet = categoryFeatures.every(f => current[f.id]?.[flag]);
    setRolePerms(prev => {
      const updated = { ...prev[roleId] || {} };
      for (const f of categoryFeatures) {
        updated[f.id] = { ...(updated[f.id] || { read: false, write: false, execute: false }), [flag]: !allSet };
      }
      return { ...prev, [roleId]: updated };
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
      load(); // refresh counts
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Permission counts for a role
  const getPermCounts = (roleId) => {
    const perms = rolePerms[roleId] || {};
    let read = 0, write = 0, execute = 0;
    for (const fId of Object.keys(perms)) {
      if (perms[fId]?.read) read++;
      if (perms[fId]?.write) write++;
      if (perms[fId]?.execute) execute++;
    }
    return { read, write, execute, total: features.length };
  };

  const openCreate = () => { setEditRole(null); setForm(EMPTY_ROLE); setShowModal(true); };
  const openEdit = (role) => { setEditRole(role); setForm({ name: role.name, slug: role.slug, description: role.description || '' }); setShowModal(true); };
  const autoSlug = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

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
      toast.error(err.structured?.message || err.message || 'Failed to save role');
    } finally { setSaving(false); }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This removes it from all assigned users.`)) return;
    try { await rbacApi.deleteRole(role.id); toast.success('Role deleted'); load(); }
    catch { toast.error('Failed to delete role'); }
  };

  // Filter features by search
  const filterFeatures = (feats) => {
    if (!search.trim()) return feats;
    const q = search.toLowerCase();
    return feats.filter(f => f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineShieldCheck className="w-6 h-6 text-primary-600" />
            Role Management <span className="text-sm font-medium text-gray-400">(What Employees can access!)</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create roles and configure feature permissions</p>
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
          {roles.map((role) => {
            const isExpanded = expanded === role.id;
            const counts = isExpanded ? getPermCounts(role.id) : null;
            return (
              <div key={role.id} className="rounded-2xl" style={NEO.raised}>
                {/* Role header */}
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
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {role.permission_count || 0} permissions · {role.user_count || 0} users
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                    {isExpanded
                      ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400" />
                      : <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded permissions */}
                {isExpanded && (
                  <div className="border-t border-gray-200/60 px-5 py-4 space-y-4">
                    {/* Search + Permission summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search features..."
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 outline-none"
                        />
                      </div>
                      {/* Permission summary badges */}
                      {counts && (
                        <div className="flex items-center gap-2">
                          <PermBadge label="Read" count={counts.read} total={counts.total} color="green" />
                          <PermBadge label="Write" count={counts.write} total={counts.total} color="blue" />
                          <PermBadge label="Execute" count={counts.execute} total={counts.total} color="purple" />
                        </div>
                      )}
                    </div>

                    {/* Features grouped by category */}
                    <div className="space-y-4">
                      {categories.map(cat => {
                        const catFeatures = filterFeatures(featuresByCategory[cat] || []);
                        if (catFeatures.length === 0) return null;
                        const perms = rolePerms[role.id] || {};
                        return (
                          <div key={cat}>
                            {/* Category header with select-all toggles */}
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex-1">{cat}</span>
                              <span className="text-[9px] text-gray-400 hidden sm:block">{catFeatures.length} features</span>
                              {['read', 'write', 'execute'].map(flag => {
                                const allSet = catFeatures.every(f => perms[f.id]?.[flag]);
                                return (
                                  <button key={flag} onClick={() => toggleCategory(role.id, catFeatures, flag)}
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors
                                      ${allSet ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                    title={`Toggle all ${flag} in ${cat}`}>
                                    {flag.charAt(0).toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Feature rows */}
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                              {catFeatures.map((f, idx) => {
                                const p = perms[f.id] || { read: false, write: false, execute: false };
                                return (
                                  <div key={f.id} className={`flex items-center px-4 py-2.5 ${idx > 0 ? 'border-t border-gray-50' : ''} hover:bg-white/40 transition-colors`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-700">{f.name}</p>
                                      {f.description && <p className="text-[10px] text-gray-400 truncate">{f.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {['read', 'write', 'execute'].map(flag => (
                                        <label key={flag} className="flex items-center gap-1.5 cursor-pointer">
                                          <button
                                            type="button"
                                            onClick={() => togglePerm(role.id, f.id, flag)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                              ${p[flag]
                                                ? 'bg-primary-500 border-primary-500'
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                              }`}>
                                            {p[flag] && (
                                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                          <span className={`text-[10px] font-medium hidden sm:inline ${p[flag] ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {flag.charAt(0).toUpperCase() + flag.slice(1)}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Save */}
                    <div className="flex justify-end pt-2">
                      <button onClick={() => savePermissions(role.id)} disabled={saving}
                        className="btn-primary text-sm px-6">
                        {saving ? 'Saving…' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRole ? 'Edit Role' : 'Create Role'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: editRole ? form.slug : autoSlug(e.target.value) })}
              className="input-field" placeholder="e.g. Cashier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input type="text" required value={form.slug}
              onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })}
              className="input-field font-mono text-sm" placeholder="e.g. cashier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editRole ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PermBadge({ label, count, total, color }) {
  const colors = {
    green:  count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
    blue:   count > 0 ? 'bg-blue-100 text-blue-700'   : 'bg-gray-100 text-gray-400',
    purple: count > 0 ? 'bg-purple-100 text-purple-700': 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${colors[color]}`}>
      {label}: {count}/{total}
    </span>
  );
}
