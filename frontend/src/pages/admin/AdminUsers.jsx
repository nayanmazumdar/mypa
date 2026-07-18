import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup, HiOutlinePencil,
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
          <p className="text-sm text-gray-500 mt-1">Create user accounts. Assign them to shops from the Shops page.</p>
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
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-sm font-semibold">{u.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {u.shops && u.shops.length > 0 && (
                    <p className="text-[10px] text-primary-600 mt-0.5">{u.shops.join(', ')}</p>
                  )}
                </div>
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
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Assigned Shops</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 text-xs font-semibold">{u.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{u.phone || '—'}</td>
                  <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-4 text-xs text-gray-500">{u.shops?.join(', ') || u.shop_name || '—'}</td>
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
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-gray-100 text-gray-700' };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[role] || colors.staff}`}>{labels[role] || role}</span>;
}
