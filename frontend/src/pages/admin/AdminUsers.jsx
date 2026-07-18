import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup, HiOutlinePencil,
  HiOutlineBuildingStorefront,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

export default function AdminUsers() {
  usePageTitle('User Management');
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

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
    setLoading(true);
    try {
      // Load staff from all shops to build a global user list
      const res = await api.get('/auth/all-users');
      setUsers(res.data || []);
    } catch {
      // Fallback: aggregate from shops
      try {
        const profile = await api.get('/auth/profile');
        const shops = profile.data?.shops || [];
        const allStaff = [];
        const seen = new Set();
        for (const shop of shops) {
          try {
            const res = await api.get('/auth/staff', { params: { shop_id: shop.id } });
            for (const m of (res.data || [])) {
              if (!seen.has(m.id)) { seen.add(m.id); allStaff.push({ ...m, shops: [shop.name] }); }
              else { const existing = allStaff.find(u => u.id === m.id); if (existing) existing.shops.push(shop.name); }
            }
          } catch {}
        }
        setUsers(allStaff);
      } catch { setUsers([]); }
    }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await api.post('/auth/create-user', form);
      toast.success('User created! You can now assign them to a shop.');
      setShowCreateModal(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to create user');
    } finally { setSaving(false); }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineUserGroup className="w-6 h-6 text-primary-600" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create user (Staff) accounts. Assign them to any shops of the business owner.</p>
        </div>
        <button onClick={() => { setForm({ name: '', email: '', password: '', phone: '' }); setShowCreateModal(true); }}
          className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto">
          <HiOutlinePlus className="w-4 h-4" /> Create User
        </button>
      </div>

      {/* Users list */}
      {users.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineUserGroup className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No users yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first team member</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">Create User</button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={NEO.raised}>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100/50">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.is_owner ? 'bg-purple-100' : 'bg-primary-100'}`}>
                  <span className={`text-sm font-semibold ${u.is_owner ? 'text-purple-700' : 'text-primary-700'}`}>{u.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.name} {u.is_owner && <span className="text-[10px] text-purple-500 font-normal">(You)</span>}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {u.shops && u.shops.length > 0 && (
                    <p className="text-[10px] text-primary-600 mt-0.5">{u.shops.join(', ')}</p>
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
                <RoleBadge role={u.role} />
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead style={{ background: 'rgba(200,207,216,0.2)' }}>
              <tr>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.is_owner ? 'bg-purple-100' : 'bg-primary-100'}`}>
                        <span className={`text-xs font-semibold ${u.is_owner ? 'text-purple-700' : 'text-primary-700'}`}>{u.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{u.name} {u.is_owner && <span className="text-[10px] text-purple-500 font-normal ml-1">(You)</span>}</p>
                          {u.is_owner ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-700">
                              <span className="w-1 h-1 rounded-full bg-green-500" /> Active
                            </span>
                          ) : (
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
                        </div>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        <p className="text-[10px] text-primary-600 mt-0.5">{u.shops?.join(', ') || u.shop_name || <span className="text-gray-400">No shop assigned</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{u.phone || '—'}</td>
                  <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-4">
                    {u.is_owner ? (
                      <span className="text-[10px] text-gray-400 italic">Business Owner</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditDetails(u)} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Edit name & phone">
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => openEditShops(u)} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors" title="Edit assigned shops">
                          <HiOutlineBuildingStorefront className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-xs text-gray-500">Create a user account. After creation, assign them to shops from the <b>Shops & Users</b> page.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Staff name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create User'}</button>
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
  const colors = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-gray-100 text-gray-700' };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[role] || colors.staff}`}>{labels[role] || role}</span>;
}
