import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil,
  HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineBuildingStorefront, HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { Modal, LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';
import { updateShopStatus, setActiveShop, loadUser } from '../../store/authSlice';
import { resolveDefaultRoute } from '../RoleSelector';

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
  const [shopForm, setShopForm] = useState({ name: '', address: '', phone: '', email: '', gst_number: '' });
  const [saving, setSaving] = useState(false);

  // Staff for manage modal
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ email: '', role: 'staff' });
  const [assignResult, setAssignResult] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => { loadShops(); }, []);

  const loadShops = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/profile');
      setShops(res.data?.shops || []);
    } catch { setShops(user?.shops || []); }
    finally { setLoading(false); }
  };

  const loadStaff = async (shopId) => {
    setStaffLoading(true);
    try {
      const res = await api.get('/auth/staff', { params: { shop_id: shopId } });
      setStaff(res.data || []);
    } catch { setStaff([]); }
    finally { setStaffLoading(false); }
  };

  // ── Enter Shop ────────────────────────────────────────────────────────────
  const handleEnterShop = async (shop) => {
    try {
      const response = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: s, role, default_module, log_id } = response.data;
      localStorage.setItem('token', token);
      const updated = { ...user, shop_id: s.id, shop_name: s.name, role, default_module: default_module || user?.default_module, log_id };
      localStorage.setItem('user', JSON.stringify(updated));
      dispatch(setActiveShop({ shop_id: s.id, shop_name: s.name, role, default_module: default_module || user?.default_module, log_id }));
      toast.success(`Entered ${s.name}`);
      navigate(resolveDefaultRoute(updated.default_module, 'shop'));
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
  const handleEmailCheck = async (email) => {
    if (!email || !email.includes('@')) return;
    setCheckingEmail(true);
    try {
      const res = await api.post('/auth/check-email', { email });
      setAssignResult(res.data);
    } catch { setAssignResult(null); }
    finally { setCheckingEmail(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignResult?.exists) { toast.error('User not found. Create them first in Users page.'); return; }
    setSaving(true);
    try {
      await api.post('/auth/staff', { email: assignForm.email, role: assignForm.role, shop_id: manageShop.id });
      toast.success('User assigned to shop');
      setAssignForm({ email: '', role: 'staff' });
      setAssignResult(null);
      loadStaff(manageShop.id);
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
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
  const resetShopForm = () => setShopForm({ name: '', address: '', phone: '', email: '', gst_number: '' });

  const openManage = (shop) => {
    setManageShop(shop);
    setManageTab('details');
    setShopForm({ name: shop.name || '', address: shop.address || '', phone: shop.phone || '', email: shop.email || '', gst_number: shop.gst_number || '' });
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
                  <button onClick={() => handleEnterShop(shop)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all hidden sm:flex items-center gap-1">
                    <HiOutlineArrowRightOnRectangle className="w-3.5 h-3.5" /> Enter
                  </button>
                  <button onClick={() => openManage(shop)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1" style={NEO.raisedSm}>
                    <HiOutlineCog6Tooth className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Manage</span>
                  </button>
                  <button onClick={() => setConfirmToggle(shop)} title={isOpen ? 'Close shop' : 'Open shop'}
                    className={`p-2 rounded-xl transition-all ${isOpen ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} style={NEO.raisedSm}>
                    {isOpen ? <HiOutlineXCircle className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Create Shop Modal ═══ */}
      <Modal open={showCreateShop} onClose={() => setShowCreateShop(false)} title="Create New Shop">
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
      <Modal open={!!manageShop} onClose={() => { setManageShop(null); setConfirmRemove(null); }} title="" size="xl">
        {manageShop && (
          <div className="flex h-[460px] -m-6 -mt-2">
            {/* Left sidebar nav */}
            <div className="w-44 flex-shrink-0 py-4 px-3 flex flex-col gap-1 overflow-y-auto" style={{ borderRight: '1px solid rgba(200,207,216,0.4)' }}>
              <div className="px-3 mb-3">
                <p className="text-sm font-bold text-gray-900 truncate">{manageShop.name}</p>
                <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold ${manageShop.is_open ? 'text-green-600' : 'text-orange-500'}`}>
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

                  {/* Assign form */}
                  <form onSubmit={handleAssign} className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Email</label>
                      <input type="email" required value={assignForm.email} placeholder="user@example.com"
                        onChange={(e) => { setAssignForm({ ...assignForm, email: e.target.value }); setAssignResult(null); }}
                        onBlur={(e) => handleEmailCheck(e.target.value)}
                        className="input-field text-sm" />
                      {checkingEmail && <span className="absolute right-3 bottom-2.5 w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Role</label>
                      <select value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })} className="input-field text-sm">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <button type="submit" disabled={saving || !assignResult?.exists}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 transition-all">
                      Assign
                    </button>
                  </form>
                  {assignResult?.exists && <p className="text-xs text-green-600">✓ Found: <b>{assignResult.name}</b></p>}
                  {assignResult && !assignResult.exists && <p className="text-xs text-amber-600">User not found. Create in Users page first.</p>}

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
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : m.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {m.role === 'admin' ? 'Owner' : m.role === 'manager' ? 'Manager' : 'Staff'}
                          </span>
                          {m.role !== 'admin' && (
                            <button onClick={() => setConfirmRemove(m)} className="p-1 rounded text-gray-400 hover:text-red-500" title="Remove">
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                            </button>
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
                  <div className="flex items-center justify-between p-4 rounded-xl" style={NEO.inset}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${manageShop.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
                        {manageShop.is_open ? 'Shop is Open' : 'Shop is Closed'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{manageShop.is_open ? 'Staff can log in' : 'Staff blocked'}</p>
                    </div>
                    <button onClick={() => setConfirmToggle(manageShop)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-white ${manageShop.is_open ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                      {manageShop.is_open ? 'Close' : 'Open'}
                    </button>
                  </div>

                  {/* POS Config */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Receipt & Billing</p>
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
                        <input type="number" step="0.01" defaultValue="5" className="input-field text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tax Label</label>
                        <input type="text" defaultValue="GST" className="input-field text-sm" />
                      </div>
                    </div>
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
      <Modal open={!!confirmToggle} onClose={() => setConfirmToggle(null)} title={confirmToggle?.is_open ? 'Close Shop?' : 'Open Shop?'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmToggle?.is_open
              ? <>Close <b>{confirmToggle?.name}</b>? Staff will be blocked.</>
              : <>Open <b>{confirmToggle?.name}</b>? Staff can log in.</>}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmToggle(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleToggleShop}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${confirmToggle?.is_open ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
              {confirmToggle?.is_open ? 'Yes, Close' : 'Yes, Open'}
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
