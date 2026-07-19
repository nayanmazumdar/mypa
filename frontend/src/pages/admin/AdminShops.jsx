import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil,
  HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineBuildingStorefront, HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth, HiOutlineXMark,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';
import { updateShopStatus, setActiveShop, loadUser } from '../../store/authSlice';
import { getFirstAccessibleRoute } from '../../utils/permissions';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  raisedSm: { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

export default function AdminShops() {
  usePageTitle('Shops');
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [manageShop, setManageShop] = useState(null); // the shop being managed
  const [manageTab, setManageTab] = useState('details');
  const [confirmToggle, setConfirmToggle] = useState(null);

  // Forms
  const [shopForm, setShopForm] = useState({ name: '', address: '', phone: '', email: '', gst_number: '', tax_rate: '5', tax_label: 'GST', gst_type: 'without_gst' });
  const [saving, setSaving] = useState(false);
  const [gstEditEnabled, setGstEditEnabled] = useState(false);

  // Staff for manage modal
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]); // users not yet in this shop
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => { loadShops(); }, []);

  const loadShops = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/profile');
      // Only show shops where the current user is the owner (admin role)
      const allShops = res.data?.shops || [];
      const ownedShops = allShops.filter(s => s.user_role === 'admin');
      setShops(ownedShops);
    } catch { setShops(user?.shops || []); }
    finally { setLoading(false); }
  };

  const loadStaff = async (shopId) => {
    setStaffLoading(true);
    try {
      const res = await api.get('/auth/staff', { params: { shop_id: shopId } });
      const staffList = res.data || [];
      setStaff(staffList);
      // Load users not in this shop for autocomplete
      try {
        const usersRes = await api.get('/admin/users');
        const allUsers = usersRes.data || [];
        const staffIds = new Set(staffList.map(s => s.id));
        setAvailableUsers(allUsers.filter(u => !staffIds.has(u.id)));
      } catch { setAvailableUsers([]); }
    } catch { setStaff([]); setAvailableUsers([]); }
    finally { setStaffLoading(false); }
  };

  // ── Enter Shop ────────────────────────────────────────────────────────────
  const handleEnterShop = async (shop) => {
    try {
      const response = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: s, role, default_module, log_id, rbac_roles, rbac_perms } = response.data;
      localStorage.setItem('token', token);
      const updated = {
        ...user, shop_id: s.id, shop_name: s.name, role,
        default_module: default_module || user?.default_module, log_id,
        rbac_roles: rbac_roles || [], rbac_perms: rbac_perms || {},
      };
      localStorage.setItem('user', JSON.stringify(updated));
      dispatch(setActiveShop({
        shop_id: s.id, shop_name: s.name, role,
        default_module: default_module || user?.default_module,
        log_id, rbac_roles, rbac_perms,
      }));
      toast.success(`Entered ${s.name}`);
      navigate(getFirstAccessibleRoute(updated));
    } catch (err) { toast.error(err.structured?.message || 'Failed to enter shop'); }
  };

  // ── Shop CRUD ─────────────────────────────────────────────────────────────
  const handleCreateShop = async (e) => {
    e.preventDefault();
    if (!shopForm.name.trim()) { toast.error('Shop name is required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/auth/create-shop', shopForm);
      localStorage.setItem('token', res.data.token);
      dispatch(loadUser());
      toast.success('Shop created!');
      setShowCreateShop(false);
      resetShopForm();
      loadShops();
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    if (!shopForm.name.trim()) { toast.error('Shop name is required'); return; }
    setSaving(true);
    try {
      await api.put('/auth/shop', { ...shopForm, shop_id: manageShop.id });
      toast.success('Shop updated');
      loadShops();
      setManageShop((s) => ({ ...s, ...shopForm }));
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleShop = async () => {
    if (!confirmToggle) return;
    try {
      await api.patch('/auth/shop/status', { shop_id: confirmToggle.id });
      const newOpen = !confirmToggle.is_open;
      dispatch(updateShopStatus({ shop_id: confirmToggle.id, is_open: newOpen }));
      toast.success(newOpen ? 'Shop opened' : 'Shop closed');
      setConfirmToggle(null);
      loadShops();
      if (manageShop?.id === confirmToggle.id) {
        setManageShop((s) => ({ ...s, is_open: newOpen ? 1 : 0 }));
        loadStaff(confirmToggle.id);
      }
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
  };

  // ── Staff Assignment ───────────────────────────────────────────────────────
  const filteredUsers = availableUsers.filter(u => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setAssignSearch(u.name + ' (' + u.email + ')');
    setShowDropdown(false);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedUser) { toast.error('Select a user from the list'); return; }
    if (!manageShop?.id) { toast.error('No shop selected'); return; }
    setSaving(true);
    try {
      await api.post('/auth/staff', { email: selectedUser.email, role: 'staff', shop_id: manageShop.id });
      toast.success(`${selectedUser.name} added to shop`);
      setSelectedUser(null);
      setAssignSearch('');
      loadStaff(manageShop.id);
      // Refresh available users
      setTimeout(() => loadAvailableUsers(manageShop.id), 300);
    } catch (err) { toast.error(err.structured?.message || 'Failed to add user'); }
    finally { setSaving(false); }
  };

  const handleRemoveStaff = async () => {
    if (!confirmRemove) return;
    try {
      await api.delete(`/auth/staff/${confirmRemove.id}`, { params: { shop_id: manageShop.id } });
      toast.success('User removed from shop');
      setConfirmRemove(null);
      loadStaff(manageShop.id);
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetShopForm = () => setShopForm({ name: '', address: '', phone: '', email: '', gst_number: '', tax_rate: '5', tax_label: 'GST', gst_type: 'without_gst' });

  const openManage = (shop) => {
    setManageShop(shop);
    setManageTab('details');
    setShopForm({ name: shop.name || '', address: shop.address || '', phone: shop.phone || '', email: shop.email || '', gst_number: shop.gst_number || '', tax_rate: shop.tax_rate || '5', tax_label: shop.tax_label || 'GST', gst_type: shop.gst_type || 'without_gst' });
    loadStaff(shop.id);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shops</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your businesses</p>
        </div>
        <button onClick={() => { resetShopForm(); setShowCreateShop(true); }}
          className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto">
          <HiOutlinePlus className="w-4 h-4" /> New Shop
        </button>
      </div>

      {/* Shop cards grid */}
      {shops.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineBuildingStorefront className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No shops yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first shop to get started</p>
          <button onClick={() => setShowCreateShop(true)} className="btn-primary text-sm">Create Shop</button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={NEO.raised}>
          {shops.map((shop, idx) => {
            const isOpen = !!shop.is_open;
            return (
              <div key={shop.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/30 transition-colors"
                style={idx < shops.length - 1 ? { borderBottom: '1px solid rgba(200,207,216,0.3)' } : {}}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-primary-50' : 'bg-gray-100'}`}
                  style={NEO.inset}>
                  <HiOutlineBuildingStorefront className={`w-5 h-5 ${isOpen ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{shop.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-orange-400'}`} />
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{shop.address || 'No address'}{shop.phone ? ` · ${shop.phone}` : ''}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleEnterShop(shop)} title="Visit the Shop!"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all hidden sm:flex items-center gap-1">
                    <HiOutlineArrowRightOnRectangle className="w-3.5 h-3.5" /> Enter
                  </button>
                  <button onClick={() => openManage(shop)} title="Setup your shop for billing!"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all flex items-center gap-1" style={NEO.raisedSm}>
                    <HiOutlineCog6Tooth className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Manage</span>
                  </button>
                  <button onClick={() => setConfirmToggle(shop)} title={isOpen ? 'Close shop — blocks staff access' : 'Open shop — allows staff to log in'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${isOpen ? 'text-red-700 hover:bg-red-50 border border-red-300' : 'text-green-600 hover:bg-green-50 border border-green-200'}`} style={NEO.raisedSm}>
                    {isOpen ? <HiOutlineXCircle className="w-3.5 h-3.5" /> : <HiOutlineCheckCircle className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isOpen ? 'Close' : 'Open'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Getting Started Info ═══ */}
      {shops.length > 0 && (
        <div className="rounded-2xl p-5 mt-2" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e8edf5 50%, #f0fdf4 100%)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100">
              <span className="text-lg">🚀</span>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-800">Shop created successfully!</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                You're just a few steps away from going live. Navigate to the <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200" style={{ boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>⚙️ Manage</span> section to verify your business credentials, configure your billing preferences, and complete the initial setup.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Once configured, your shop will be ready to process sales, generate invoices, and manage day-to-day business transactions. <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-semibold text-white bg-primary-600" style={{ boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>↗ Enter</span> your shop to get started.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Credentials</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Billing</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Go Live</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ═══ Create Shop Modal ═══ */}
      <Modal open={showCreateShop} onClose={() => setShowCreateShop(false)} title="Create New Shop" size="lg">
        <form onSubmit={handleCreateShop} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
            <input type="text" required value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} className="input-field" placeholder="e.g. Green Mart" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea rows={2} value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} className="input-field" placeholder="Street, Area, City" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
              <input type="text" value={shopForm.gst_number} onChange={(e) => setShopForm({ ...shopForm, gst_number: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={shopForm.email} onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateShop(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Shop'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ Manage Shop Modal — left panel nav ═══ */}
      <Modal open={!!manageShop} onClose={() => { setManageShop(null); setConfirmRemove(null); }} title="" size="full">
        {manageShop && (
          <div className="flex h-[560px] -m-6 -mt-2">
            {/* Left sidebar nav */}
            <div className="w-48 flex-shrink-0 pt-6 pb-4 px-3 flex flex-col gap-1 overflow-y-auto" style={{ borderRight: '1px solid rgba(200,207,216,0.4)' }}>
              <div className="px-3 mb-4 flex flex-col items-center text-center">
                <img src="/logo.png" alt="MyPA" className="w-11 h-11 rounded-full mb-4" style={{ boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff, inset 1px 1px 2px rgba(255,255,255,0.6)' }} />
                <p className="text-sm font-bold text-gray-900 leading-tight break-words w-full">{manageShop.name}</p>
                <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${manageShop.is_open ? 'text-green-600' : 'text-orange-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${manageShop.is_open ? 'bg-green-500' : 'bg-orange-400'}`} />
                  {manageShop.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
              {[
                { id: 'details', label: 'Shop Details', icon: HiOutlinePencil },
                { id: 'staff', label: 'Staff', icon: HiOutlineUserGroup },
                { id: 'settings', label: 'Settings', icon: HiOutlineCog6Tooth },
              ].map((t) => (
                <button key={t.id} onClick={() => setManageTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                    manageTab === t.id ? 'text-primary-700 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
              <div className="mt-auto pt-4 px-2 text-center">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">🚀 You are now a <span className="text-primary-600 font-bold">MyPA</span> enabled business!</p>
                <p className="text-[10px] font-bold tracking-wide mt-1"><span className="text-orange-500">Create.</span> <span className="text-blue-500">Manage.</span> <span className="text-green-500">Grow.</span></p>
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 p-6 overflow-y-auto">

              {/* ─── Details ─── */}
              {manageTab === 'details' && (
                <form onSubmit={handleSaveShop} className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-4">Shop Details</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                    <input type="text" required value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                    <textarea rows={2} value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                      <input type="tel" value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">GST</label>
                      <input type="text" value={shopForm.gst_number} onChange={(e) => setShopForm({ ...shopForm, gst_number: e.target.value })} className="input-field" />
                      {shopForm.gst_number !== (manageShop?.gst_number || '') && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1">⚠️ Change is complied with GoI GST Norms?</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <input type="email" value={shopForm.email} onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })} className="input-field" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setManageShop(null)} className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 transition-all" style={NEO.raisedSm}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ─── Staff ─── */}
              {manageTab === 'staff' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800">Assigned Staff</h4>
                  <p className="text-[11px] text-gray-400">Add users to this shop. Manage their RBAC roles from the <b>Users</b> page.</p>

                  {/* Autocomplete assign form */}
                  <form onSubmit={handleAssign} className="space-y-2">
                    <div className="relative">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Search user to add</label>
                      <input
                        type="text"
                        value={assignSearch}
                        onChange={(e) => { setAssignSearch(e.target.value); setSelectedUser(null); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type name or email..."
                        className="input-field text-sm w-full"
                        autoComplete="off"
                      />
                      {/* Dropdown */}
                      {showDropdown && assignSearch.trim() && !selectedUser && (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                          {filteredUsers.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-400">No matching users available</p>
                          ) : (
                            filteredUsers.slice(0, 8).map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectUser(u)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 transition-colors"
                              >
                                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary-700 text-[10px] font-bold">{u.name?.charAt(0)?.toUpperCase()}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedUser && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 border border-primary-200">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 text-[9px] font-bold">{selectedUser.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary-800 truncate">{selectedUser.name}</p>
                          <p className="text-[10px] text-primary-500 truncate">{selectedUser.email}</p>
                        </div>
                        <button type="button" onClick={() => { setSelectedUser(null); setAssignSearch(''); }}
                          className="text-primary-400 hover:text-red-500 p-0.5">
                          <HiOutlineXMark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button type="submit" disabled={saving || !selectedUser}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 transition-all">
                      {saving ? 'Adding...' : 'Add to Shop'}
                    </button>
                  </form>

                  {/* Staff list */}
                  {staffLoading ? (
                    <div className="py-8 text-center"><span className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin inline-block" /></div>
                  ) : staff.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No users assigned to this shop yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {staff.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={NEO.inset}>
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 text-[10px] font-bold">{m.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{m.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                          </div>
                          {m.role !== 'admin' && (
                            <button onClick={() => setConfirmRemove(m)} className="p-1 rounded text-gray-400 hover:text-red-500" title="Remove from shop">
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {m.role === 'admin' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Owner</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Settings ─── */}
              {manageTab === 'settings' && (
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-gray-800">Shop Settings</h4>

                  {/* Status */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${manageShop.is_open ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`} style={NEO.inset}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${manageShop.is_open ? 'bg-green-100' : 'bg-red-100'}`}>
                        {manageShop.is_open
                          ? <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />
                          : <HiOutlineXCircle className="w-5 h-5 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {manageShop.is_open ? 'Shop is Open' : 'Shop is Closed'}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {manageShop.is_open
                            ? 'Staff can log in and process sales'
                            : 'All staff access is blocked — no billing or sales'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setConfirmToggle(manageShop)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm ${manageShop.is_open ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}`}>
                      {manageShop.is_open ? '🔒 Close Shop' : '🔓 Open Shop'}
                    </button>
                  </div>

                  {/* POS Config */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Receipt & Billing</p>

                    {/* GST Billing Type */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">GST Billing Type <span className="text-amber-600 font-medium">⚠️ The GST billing type will effect the POS Billing!</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'without_gst', label: 'Without GST', desc: 'No tax applied' },
                          { value: 'gst_inclusive', label: 'GST Inclusive', desc: 'Tax included in price' },
                          { value: 'gst_exclusive', label: 'GST Exclusive', desc: 'Tax added on top' },
                        ].map(opt => (
                          <label key={opt.value} className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-colors ${shopForm.gst_type === opt.value ? 'border-primary-300 bg-primary-50' : 'border-transparent hover:bg-gray-50'}`}>
                            <input type="radio" name="gst_type" value={opt.value} checked={shopForm.gst_type === opt.value}
                              onChange={(e) => setShopForm({ ...shopForm, gst_type: e.target.value })}
                              className="w-3.5 h-3.5 text-primary-600" />
                            <div>
                              <span className="text-xs font-semibold text-gray-800">{opt.label}</span>
                              <span className="text-[10px] text-gray-400 ml-1">— {opt.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Receipt Header</label>
                      <input type="text" className="input-field text-sm" placeholder="Shop name shown on receipt" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Receipt Footer</label>
                      <input type="text" className="input-field text-sm" placeholder="Thank you! Visit again." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tax Rate (%)</label>
                        {!gstEditEnabled ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{shopForm.tax_rate}%</span>
                            <button type="button" onClick={() => setGstEditEnabled(true)} className="text-primary-600 hover:text-primary-700 text-[10px] font-medium underline">Edit</button>
                            <a href="/UnderstandingGST.png" target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-purple-600 hover:text-purple-700 underline">GST Reference</a>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input type="number" step="0.01" value={shopForm.tax_rate} onChange={(e) => setShopForm({ ...shopForm, tax_rate: e.target.value })} autoFocus className="input-field text-sm" />
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => {
                                if (window.confirm('Are you sure this change complies with GoI GST Norms?')) {
                                  setGstEditEnabled(false);
                                  toast.success('Tax rate updated');
                                }
                              }} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-primary-600 hover:bg-primary-700">Save</button>
                              <button type="button" onClick={() => setGstEditEnabled(false)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-amber-600 font-medium mt-1">⚠️ Admin declares that the GST rate above is complied with GoI GST norms!</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tax Label</label>
                        <input type="text" value={shopForm.tax_label} onChange={(e) => setShopForm({ ...shopForm, tax_label: e.target.value })} className="input-field text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Save Settings */}
                  <div className="pt-3">
                    <button type="button" onClick={(e) => handleSaveShop(e)} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all">
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(200,207,216,0.3)' }}>
                    <p className="text-xs font-semibold text-red-500 uppercase mb-2">Danger Zone</p>
                    <p className="text-xs text-gray-500 mb-2">Disabling a shop prevents all access including the owner.</p>
                    <button className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-all">
                      Disable Shop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Toggle Confirmation ═══ */}
      <Modal open={!!confirmToggle} onClose={() => setConfirmToggle(null)} title={confirmToggle?.is_open ? '🔒 Close Shop' : '🔓 Open Shop'}>
        <div className="space-y-4">
          {/* Visual indicator */}
          <div className={`flex items-center gap-3 p-4 rounded-xl ${confirmToggle?.is_open ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmToggle?.is_open ? 'bg-orange-100' : 'bg-green-100'}`}>
              {confirmToggle?.is_open
                ? <HiOutlineXCircle className="w-5 h-5 text-orange-600" />
                : <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{confirmToggle?.name}</p>
              <p className="text-xs text-gray-500">
                {confirmToggle?.is_open
                  ? 'This shop will be marked as closed for the day!'
                  : 'This shop will be marked as open'}
              </p>
            </div>
          </div>

          {/* Impact info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">What happens</p>
            {confirmToggle?.is_open ? (
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> All staff members will be blocked from logging in</li>
                <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> No sales or billing can be processed</li>
                <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> You can reopen anytime from this page</li>
              </ul>
            ) : (
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span> Staff will be able to log in again</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span> POS and billing will resume</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span> All previously assigned staff are re-enabled</li>
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setConfirmToggle(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleToggleShop}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${confirmToggle?.is_open ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}`}>
              {confirmToggle?.is_open ? '🔒 Yes, Close Shop' : '🔓 Yes, Open Shop'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Remove Staff Confirmation ═══ */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove from Shop">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Remove <b>{confirmRemove?.name}</b> from this shop?</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmRemove(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleRemoveStaff} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
