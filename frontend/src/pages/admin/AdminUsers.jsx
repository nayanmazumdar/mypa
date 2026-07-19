import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup, HiOutlinePencil,
  HiOutlineShieldCheck, HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineCheck, HiOutlineXMark,
  HiOutlineBuildingStorefront,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { rbacApi } from '../../api/rbac.api';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  inset:  { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

const EMPTY_CREATE = { name: '', email: '', password: '', phone: '', account_role: 'staff', role_ids: [] };

export default function AdminUsers() {
  usePageTitle('User Management');
  const { user: currentUser } = useSelector((s) => s.auth);

  const [loading,        setLoading]        = useState(true);
  const [users,          setUsers]          = useState([]);
  const [roles,          setRoles]          = useState([]);      // all RBAC roles available
  const [userRolesMap,   setUserRolesMap]   = useState({});      // { [userId]: Set<roleId> }
  const [loadingRoles,   setLoadingRoles]   = useState({});      // { [userId]: bool }
  const [savingRoles,    setSavingRoles]    = useState({});      // { [userId]: bool }
  const [expanded,       setExpanded]       = useState(null);    // userId of expanded row
  const [activeTab,      setActiveTab]      = useState('roles'); // 'roles' | 'edit' per expanded user
  const [editForms,      setEditForms]      = useState({});      // { [userId]: {name,phone,email,is_active} }
  const [savingEdit,     setSavingEdit]     = useState({});      // { [userId]: bool }
  const [showCreate,     setShowCreate]     = useState(false);
  const [createForm,     setCreateForm]     = useState(EMPTY_CREATE);
  const [saving,         setSaving]         = useState(false);

  // Edit shops state
  const [showShopsModal, setShowShopsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [adminShops, setAdminShops] = useState([]);
  const [selectedShopIds, setSelectedShopIds] = useState([]);
  const [shopRole, setShopRole] = useState('staff');
  const [savingShops, setSavingShops] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);

  // Edit details state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'staff', isActive: true });
  const [editTarget, setEditTarget] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
  // Load users + all RBAC roles in parallel
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin/users'),
        rbacApi.getRoles(),
      ]);
      setUsers(usersRes.data || usersRes || []);
      setRoles(rolesRes.data || rolesRes || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Expand/collapse user row ──────────────────────────────
  const toggleExpand = async (u) => {
    if (expanded === u.id) { setExpanded(null); return; }

    setExpanded(u.id);
    setActiveTab('roles');

    // Init edit form if not already
    if (!editForms[u.id]) {
      setEditForms(prev => ({
        ...prev,
        [u.id]: { name: u.name, phone: u.phone || '', email: u.email, is_active: u.is_active ?? 1 },
      }));
    }

    // Load assigned roles if not cached
    if (!userRolesMap[u.id]) {
      setLoadingRoles(prev => ({ ...prev, [u.id]: true }));
      try {
        const res = await rbacApi.getUserRoles(u.id);
        const rolesData = res.data || res || [];
        const ids = new Set(rolesData.map(r => r.role_id));
        setUserRolesMap(prev => ({ ...prev, [u.id]: ids }));
      } catch {
        toast.error('Failed to load roles for user');
      } finally {
        setLoadingRoles(prev => ({ ...prev, [u.id]: false }));
      }
    }
  };

  // ── Toggle a role checkbox for a user ────────────────────
  const toggleRole = (userId, roleId) => {
    setUserRolesMap(prev => {
      const current = new Set(prev[userId] || []);
      if (current.has(roleId)) current.delete(roleId); else current.add(roleId);
      return { ...prev, [userId]: new Set(current) };
    });
  };

  // ── Save role assignment ──────────────────────────────────
  const saveRoles = async (userId) => {
    setSavingRoles(prev => ({ ...prev, [userId]: true }));
    try {
      const roleIds = Array.from(userRolesMap[userId] || []);
      await rbacApi.assignRolesToUser(userId, roleIds);
      toast.success('Roles updated — takes effect on next login');
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save roles');
    } finally {
      setSavingRoles(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ── Save user edit ────────────────────────────────────────
  const saveEdit = async (userId) => {
    setSavingEdit(prev => ({ ...prev, [userId]: true }));
    try {
      const form = editForms[userId];
      await api.patch(`/admin/users/${userId}`, form);
      toast.success('User updated');
      // Refresh user list to reflect changes
      load();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update user');
    } finally {
      setSavingEdit(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ── Create user ───────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error('Name and email are required'); return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone,
        role: createForm.account_role,
        role_ids: createForm.role_ids.length > 0 ? createForm.role_ids : undefined,
      };
      await api.post('/admin/users', payload);
      toast.success('User created');
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      load();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle role in create form ────────────────────────────
  const toggleCreateRole = (roleId) => {
    setCreateForm((prev) => {
      const ids = prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId];
      return { ...prev, role_ids: ids };
    });
  };

  const openEditShops = async (u) => {
    setEditingUser(u);
    setShowShopsModal(true);
    setLoadingShops(true);
    try {
      // Load admin's shops
      const profileRes = await api.get('/auth/profile');
      const shops = profileRes.data?.shops || [];
      setAdminShops(shops);

      // Load user's current shop assignments
      const assignRes = await api.get(`/users/${u.id}/shops`);
      const assigned = assignRes.data || [];
      setSelectedShopIds(assigned.map(a => a.shop_id));
      // Use the user's existing role if available
      const firstRole = assigned[0]?.role || 'staff';
      setShopRole(firstRole === 'admin' ? 'staff' : firstRole);
    } catch (err) {
      toast.error('Failed to load shop assignments');
      setShowShopsModal(false);
    } finally { setLoadingShops(false); }
  };

  const toggleShop = (shopId) => {
    setSelectedShopIds([shopId]);
  };

  const handleSaveShops = async () => {
    if (!editingUser) return;
    setSavingShops(true);
    try {
      await api.patch(`/users/${editingUser.id}/shops`, {
        shop_ids: selectedShopIds,
        role: shopRole,
      });
      toast.success('Shop assignments updated');
      setShowShopsModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update shop assignments');
    } finally { setSavingShops(false); }
  };

  const openEditDetails = (u) => {
    setEditTarget(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      role: u.role === 'admin' ? 'staff' : (u.role || 'staff'),
      isActive: u.status === 'active',
    });
    setShowEditModal(true);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingEdit(true);
    try {
      // Save name & phone
      await api.patch(`/users/${editTarget.id}/details`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
      });
      // Save role
      if (editForm.role && editForm.role !== editTarget.role) {
        await api.patch(`/users/${editTarget.id}/role`, { role: editForm.role });
      }
      // Save active status
      const wasActive = editTarget.status === 'active';
      if (editForm.isActive !== wasActive) {
        await api.patch(`/users/${editTarget.id}/status`, { is_active: editForm.isActive });
      }
      toast.success('User details updated');
      setShowEditModal(false);
      setEditTarget(null);
      loadUsers();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update details');
    } finally { setSavingEdit(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineUserGroup className="w-6 h-6 text-primary-600" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create users, assign RBAC roles, and manage account details.
          </p>
        </div>
        <button
          onClick={() => { setCreateForm(EMPTY_CREATE); setShowCreate(true); }}
          className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" /> Create User
        </button>
      </div>

      {/* No roles warning */}
      {roles.length === 0 && (
        <div className="rounded-xl p-3 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          No RBAC roles found. Go to <b>Roles</b> in the sidebar to create roles before assigning them.
        </div>
      )}

      {/* ── User list ── */}
      {users.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineUserGroup className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No users yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first team member</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create User</button>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isExpanded      = expanded === u.id;
            const assignedRoles   = userRolesMap[u.id] || new Set();
            const assignedCount   = assignedRoles.size;
            const isLoadingRoles  = loadingRoles[u.id];
            const isSavingRoles   = savingRoles[u.id];
            const isSavingEdit    = savingEdit[u.id];
            const editForm        = editForms[u.id] || {};

            return (
              <div key={u.id} className="rounded-2xl" style={NEO.raised}>
                {/* ── Row header ── */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(u)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.is_owner ? 'bg-purple-100' : 'bg-primary-100'}`}>
                      <span className={`text-sm font-semibold ${u.is_owner ? 'text-purple-700' : 'text-primary-700'}`}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{u.name} {u.is_owner && <span className="text-[10px] text-purple-500 font-normal">(You)</span>}</p>
                        {!u.is_active && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{u.email}</p>
                      {u.shop_names && (
                        <p className="text-[10px] text-primary-600 mt-0.5">{u.shop_names}</p>
                      )}
                    </div>
                {!u.is_owner && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                    u.status === 'active' ? 'bg-green-100 text-green-700' :
                    u.status === 'unassigned' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${
                      u.status === 'active' ? 'bg-green-500' :
                      u.status === 'unassigned' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    {u.status === 'active' ? 'Active' : u.status === 'unassigned' ? 'Unassigned' : 'Disabled'}
                  </span>
                )}
                {!u.is_owner && (
                  <>
                    <button onClick={() => openEditDetails(u)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Edit name & phone">
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => openEditShops(u)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors" title="Edit shops">
                      <HiOutlineBuildingStorefront className="w-5 h-5" />
                    </button>
                  </>
                )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role badge summary */}
                    {!isExpanded && (
                      assignedCount > 0 ? (
                        <span className="hidden sm:inline text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                          {assignedCount} role{assignedCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="hidden sm:inline text-xs text-gray-400">No roles</span>
                      )
                    )}
                    <RoleBadge role={u.role} />
                    {isExpanded
                      ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <HiOutlineChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </div>
                </div>

                {/* ── Expanded panel ── */}
                {isExpanded && (
                  <div className="border-t border-gray-200/60">
                    {/* Tab bar */}
                    <div className="flex border-b border-gray-200/60 px-5">
                      <button
                        onClick={() => setActiveTab('roles')}
                        className={`py-2.5 px-1 mr-5 text-xs font-semibold border-b-2 transition-colors ${
                          activeTab === 'roles'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                          RBAC Roles
                          {assignedCount > 0 && (
                            <span className="bg-primary-100 text-primary-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {assignedCount}
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('edit')}
                        className={`py-2.5 px-1 text-xs font-semibold border-b-2 transition-colors ${
                          activeTab === 'edit'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <HiOutlinePencil className="w-3.5 h-3.5" />
                          Edit Details
                        </span>
                      </button>
                    </div>

                    {/* ── Roles tab ── */}
                    {activeTab === 'roles' && (
                      <div className="px-5 py-4 space-y-3">
                        {isLoadingRoles ? (
                          <div className="py-6 flex justify-center">
                            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                          </div>
                        ) : roles.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2">
                            No roles found. Create roles from the <b>Roles</b> page first.
                          </p>
                        ) : (
                          <RoleMultiSelect
                            roles={roles}
                            assignedRoles={assignedRoles}
                            onToggle={(roleId) => toggleRole(u.id, roleId)}
                            onSave={() => saveRoles(u.id)}
                            saving={isSavingRoles}
                          />
                        )}
                      </div>
                    )}

                    {/* ── Edit tab ── */}
                    {activeTab === 'edit' && (
                      <div className="px-5 py-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForms(prev => ({
                                ...prev, [u.id]: { ...editForm, name: e.target.value }
                              }))}
                              className="input-field text-sm"
                              placeholder="Full name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={editForm.email || ''}
                              onChange={(e) => setEditForms(prev => ({
                                ...prev, [u.id]: { ...editForm, email: e.target.value }
                              }))}
                              className="input-field text-sm"
                              placeholder="email@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={editForm.phone || ''}
                              onChange={(e) => setEditForms(prev => ({
                                ...prev, [u.id]: { ...editForm, phone: e.target.value }
                              }))}
                              className="input-field text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                            <select
                              value={editForm.is_active ?? 1}
                              onChange={(e) => setEditForms(prev => ({
                                ...prev, [u.id]: { ...editForm, is_active: Number(e.target.value) }
                              }))}
                              className="input-field text-sm"
                            >
                              <option value={1}>Active</option>
                              <option value={0}>Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => saveEdit(u.id)}
                            disabled={isSavingEdit}
                            className="btn-primary text-sm px-5"
                          >
                            {isSavingEdit ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create User Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text" required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="input-field" placeholder="Staff name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email" required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="input-field" placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password" required minLength={8}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="input-field" placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className="input-field" placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={createForm.account_role}
              onChange={(e) => setCreateForm({ ...createForm, account_role: e.target.value })}
              className="input-field"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            {createForm.account_role === 'admin' && (
              <p className="text-[11px] text-amber-600 mt-1">Admin users have full access to all features and the admin panel. RBAC roles below are optional.</p>
            )}
          </div>

          {/* ── Role assignment during creation (only relevant for staff) ── */}
          {roles.length > 0 && createForm.account_role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Roles <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <CreateRoleSelect
                roles={roles}
                selectedIds={createForm.role_ids}
                onToggle={toggleCreateRole}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Shops Modal */}
      <Modal open={showShopsModal} onClose={() => { setShowShopsModal(false); setEditingUser(null); }} title={`Edit Shops — ${editingUser?.name || ''}`}>
        {loadingShops ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Select which shop this user should be assigned to.</p>

            {/* Shop checkboxes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {adminShops.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No shops found</p>
              ) : (
                adminShops.map((shop) => (
                  <label key={shop.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors" style={selectedShopIds.includes(shop.id) ? NEO.inset : {}}>
                    <input
                      type="radio"
                      name="shop-assignment"
                      checked={selectedShopIds.includes(shop.id)}
                      onChange={() => toggleShop(shop.id)}
                      className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{shop.name}</p>
                      {shop.address && <p className="text-xs text-gray-400 truncate">{shop.address}</p>}
                    </div>
                    {!shop.is_open && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Closed</span>}
                  </label>
                ))
              )}
            </div>

            {/* Role for new assignments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role for new assignments</label>
              <select value={shopRole} onChange={(e) => setShopRole(e.target.value)} className="input-field">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">This role applies when adding to new shops. Existing shop roles are unchanged.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowShopsModal(false); setEditingUser(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveShops} disabled={savingShops} className="btn-primary">
                {savingShops ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Details Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditTarget(null); }} title="Edit Details">
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <p className={`text-xs font-medium -mt-2 text-right ${editForm.name.trim() && editForm.name.trim() !== editTarget?.name ? 'line-through text-red-500 opacity-60' : 'text-primary-600'}`}>{editTarget?.name}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-field" placeholder="Staff name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="input-field">
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <div>
              <p className={`text-sm font-medium ${editForm.isActive ? 'text-primary-700' : 'text-red-600'}`}>Status: {editForm.isActive ? 'Active' : 'Disabled'}</p>
              <p className={`text-[10px] ${editForm.isActive ? 'text-primary-500' : 'text-red-400'}`}>{editForm.isActive ? 'User can log in and work' : 'User is blocked from access'}</p>
            </div>
            <button type="button" onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowEditModal(false); setEditTarget(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={savingEdit} className="btn-primary">{savingEdit ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin:   'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    staff:   'bg-gray-100 text-gray-600',
  };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[role] || styles.staff}`}>
      {labels[role] || role || 'Staff'}
    </span>
  );
}

function RoleMultiSelect({ roles, assignedRoles, onToggle, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const assignedList = roles.filter(r => assignedRoles.has(r.id));
  const filtered = roles.filter(r => {
    if (!search.trim()) return true;
    return r.name.toLowerCase().includes(search.toLowerCase()) || r.slug.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-3">
      {/* Assigned tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {assignedList.length === 0 ? (
          <span className="text-xs text-gray-400 py-1">No roles assigned</span>
        ) : (
          assignedList.map(role => (
            <span key={role.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
              {role.name}
              <button onClick={() => onToggle(role.id)} className="text-primary-400 hover:text-red-500 ml-0.5" type="button">
                <HiOutlineXMark className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-left hover:border-gray-300 transition-colors"
        >
          <span className="text-gray-500">
            {open ? 'Close' : 'Add or remove roles…'}
          </span>
          <HiOutlineChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 outline-none"
                autoFocus
              />
            </div>
            {/* Role list */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">No matching roles</p>
              ) : (
                filtered.map(role => {
                  const isAssigned = assignedRoles.has(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => onToggle(role.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                        ${isAssigned ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isAssigned ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                        {isAssigned && (
                          <HiOutlineCheck className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isAssigned ? 'text-primary-700' : 'text-gray-700'}`}>{role.name}</p>
                        {role.description && <p className="text-[10px] text-gray-400 truncate">{role.description}</p>}
                      </div>
                      {isAssigned && <span className="text-[9px] text-primary-500 font-semibold">ASSIGNED</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving} className="btn-primary text-sm px-5">
          {saving ? 'Saving…' : 'Save Roles'}
        </button>
      </div>
    </div>
  );
}

function CreateRoleSelect({ roles, selectedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedList = roles.filter(r => selectedIds.includes(r.id));
  const filtered = roles.filter(r => {
    if (!search.trim()) return true;
    return r.name.toLowerCase().includes(search.toLowerCase()) || r.slug.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedList.map(role => (
            <span key={role.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 border border-primary-200 text-[11px] font-medium text-primary-700">
              {role.name}
              <button onClick={() => onToggle(role.id)} type="button" className="text-primary-400 hover:text-red-500">
                <HiOutlineXMark className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-left hover:border-gray-300 transition-colors">
          <span className="text-gray-500 text-xs">
            {selectedIds.length > 0 ? `${selectedIds.length} role${selectedIds.length > 1 ? 's' : ''} selected` : 'Select roles…'}
          </span>
          <HiOutlineChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..." autoFocus
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 outline-none" />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-gray-400">No matching roles</p>
              ) : (
                filtered.map(role => {
                  const isSelected = selectedIds.includes(role.id);
                  return (
                    <button key={role.id} type="button" onClick={() => onToggle(role.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                        {isSelected && <HiOutlineCheck className="w-2 h-2 text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>{role.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
