import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { updateShopStatus } from '../store/authSlice';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineBuildingStorefront, HiOutlineUserGroup,
  HiOutlinePlus, HiOutlineShieldCheck, HiOutlineCog6Tooth,
  HiOutlinePrinter, HiOutlineBell, HiOutlineReceiptPercent,
  HiOutlineTrash, HiOutlineClipboardDocumentList,
  HiOutlineArrowPathRoundedSquare, HiOutlineCalendarDays,
  HiOutlineClock, HiOutlineCheckCircle, HiOutlineXCircle,
} from 'react-icons/hi2';
import api from '../api/axios';
import { PageHeader, FilterTabs, Modal, LoadingSpinner, FormField, FormRow } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Settings() {
  usePageTitle('Settings');
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name } of member to delete
  const [attendanceModal, setAttendanceModal] = useState(null); // { member } currently editing
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    check_in: '', check_out: '', role: '', shop_status: 'open', notes: '',
  });
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingShop, setEditingShop] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
  const [existingAccount, setExistingAccount] = useState(null); // { exists, name } or null
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', area: '', pincode: '' });
  const [shopForm, setShopForm] = useState({ name: '', address: '', phone: '', email: '', gst_number: '' });
  const [shopOpen, setShopOpen] = useState(false);
  const [togglingShop, setTogglingShop] = useState(false);
  const [confirmShopToggle, setConfirmShopToggle] = useState(false);
  const [passcodeForm, setPasscodeForm] = useState({ passcode: '', confirm_passcode: '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [posSettings, setPosSettings] = useState({ receipt_header: '', receipt_footer: '', auto_print: false, sound_enabled: true });
  const [logsDate, setLogsDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (activeTab === 'team') loadStaff(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'logs') loadLogs(logsDate); }, [activeTab]);
  useEffect(() => { if (activeTab === 'logs') loadLogs(logsDate); }, [logsDate]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setProfileForm({ name: res.data.name || '', phone: res.data.phone || '', area: res.data.area || '', pincode: res.data.pincode || '' });

      // Match the active shop by shop_id — fall back to first shop
      const activeShop = res.data.shops?.find((s) => s.id === user?.shop_id) || res.data.shops?.[0];
      setShopForm({
        name: activeShop?.name || user?.shop_name || '',
        address: activeShop?.address || '',
        phone: activeShop?.phone || '',
        email: activeShop?.email || res.data.email || '',
        gst_number: activeShop?.gst_number || '',
      });

      // Authoritative is_open from DB — sync both local state and Redux
      const isOpen = activeShop?.is_open !== undefined ? !!activeShop.is_open : false;
      setShopOpen(isOpen);
      if (user?.shop_id && activeShop) {
        dispatch(updateShopStatus({ shop_id: user.shop_id, is_open: isOpen }));
      }
    } catch {}
  };

  const loadStaff = async () => {
    try { const res = await api.get('/auth/staff'); setStaff(res.data); } catch {}
  };

  const loadLogs = async (date) => {
    setLogsLoading(true);
    try {
      const res = await api.get('/login-logs', { params: { date } });
      setLogs(res.data?.logs || []);
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', profileForm);
      toast.success('Profile updated');
      setEditingProfile(false);
      loadProfile();
    } catch (err) { toast.error(err.structured?.message || 'Failed to update'); }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/shop', shopForm);
      toast.success('Shop details updated');
      setEditingShop(false);
      loadProfile();
    } catch (err) { toast.error(err.structured?.message || 'Failed to update shop'); }
  };

  const handleToggleShopStatus = async () => {
    setConfirmShopToggle(false);
    setTogglingShop(true);
    try {
      const res = await api.patch('/auth/shop/status');
      const isOpen = res.data?.is_open ?? res.is_open;
      setShopOpen(!!isOpen);
      // Sync the is_open value back into Redux + localStorage so ShopSelector
      // reflects the updated status immediately (e.g., when owner switches shops)
      if (user?.shop_id) {
        dispatch(updateShopStatus({ shop_id: user.shop_id, is_open: !!isOpen }));
      }
      toast.success(res.message || (isOpen ? '🟢 Shop is now Open' : '🔴 Shop is now Closed'));
      loadStaff(); // Refresh staff list to reflect new is_active states
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update shop status');
    } finally {
      setTogglingShop(false);
    }
  };

  const handleSetPasscode = async (e) => {
    e.preventDefault();
    if (passcodeForm.passcode !== passcodeForm.confirm_passcode) { toast.error('Passcodes do not match'); return; }
    if (!/^\d{4}$/.test(passcodeForm.passcode)) { toast.error('Passcode must be exactly 4 digits'); return; }
    try {
      await api.post('/auth/set-passcode', { passcode: passcodeForm.passcode, current_password: passcodeForm.current_password });
      toast.success('Passcode set successfully');
      setPasscodeForm({ passcode: '', confirm_passcode: '', current_password: '' });
      const saved = localStorage.getItem('remembered_account');
      if (saved) { const acc = JSON.parse(saved); acc.has_passcode = true; localStorage.setItem('remembered_account', JSON.stringify(acc)); }
    } catch (err) { toast.error(err.structured?.message || 'Failed to set passcode'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('Passwords do not match'); return; }
    if (passwordForm.new_password.length < 8) { toast.error('Min 8 characters required'); return; }
    try {
      await api.post('/auth/change-password', { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      toast.success('Password changed');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.structured?.message || 'Failed to change password'); }
  };

  const handleEmailBlur = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setCheckingEmail(true);
    try {
      const res = await api.post('/auth/check-email', { email });
      setExistingAccount(res.data || null);
    } catch {
      setExistingAccount(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...staffForm };
      // If existing account, password is not needed
      if (existingAccount?.exists) delete payload.password;
      const res = await api.post('/auth/staff', payload);
      toast.success(res.message || 'Staff member added');
      setShowStaffModal(false);
      setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' });
      setExistingAccount(null);
      loadStaff();
    } catch (err) { toast.error(err.structured?.message || 'Failed to add staff'); }
    finally { setLoading(false); }
  };

  const handleToggleStaff = async (id, active) => {
    try { await api.patch(`/users/${id}/status`, { is_active: !active }); toast.success('Updated'); loadStaff(); }
    catch { toast.error('Failed'); }
  };

  const handleDeleteStaff = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/auth/staff/${confirmDelete.id}`);
      toast.success(`${confirmDelete.name} removed from shop`);
      setConfirmDelete(null);
      loadStaff();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to remove staff');
    }
  };

  const isAdmin = user?.role === 'admin';

  if (!profile) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Manage your account, shop, team, and preferences" />

      {/* Tabs — scrollable on mobile */}
      <FilterTabs value={activeTab} onChange={setActiveTab} options={[
        { value: 'profile', label: 'Profile' },
        { value: 'security', label: 'Security' },
        { value: 'shop', label: 'Shop Details' },
        ...(isAdmin ? [{ value: 'team', label: 'Team' }] : []),
        { value: 'pos', label: 'POS & Billing' },
        { value: 'notifications', label: 'Notifications' },
        ...(isAdmin ? [{ value: 'logs', label: 'Login Logs' }] : []),
      ]} />

      {/* ========== PROFILE TAB ========== */}
      {activeTab === 'profile' && (
        <div className="card w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><HiOutlineUser className="w-5 h-5" /> Profile</h3>
            {!editingProfile && <button onClick={() => setEditingProfile(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>}
          </div>

          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality</label>
                  <input type="text" value={profileForm.area} onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })} className="input-field" placeholder="Street, Area, City" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={profileForm.pincode} onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className="input-field" placeholder="6-digit PIN" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm flex-1 sm:flex-none">Save</button>
                <button type="button" onClick={() => setEditingProfile(false)} className="btn-secondary text-sm flex-1 sm:flex-none">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="Full Name" value={profile.name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone || 'Not set'} />
              <InfoRow label="Role" value={<RoleBadge role={profile.role} />} />
              <InfoRow label="Area / Locality" value={profile.area || 'Not set'} />
              <InfoRow label="PIN Code" value={profile.pincode || 'Not set'} />
              <InfoRow label="Member Since" value={new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoRow label="Account Status" value={<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>} />
            </div>
          )}
        </div>
      )}

      {/* ========== SECURITY TAB ========== */}
      {activeTab === 'security' && (
        <div className="w-full max-w-2xl space-y-6">
          {/* Passcode */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">Quick Login PIN</h3>
            <p className="text-sm text-gray-500 mb-5">Set a 4-digit PIN to login faster without typing your full password.</p>
            <form onSubmit={handleSetPasscode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" required value={passcodeForm.current_password} onChange={(e) => setPasscodeForm({ ...passcodeForm, current_password: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
                  <input type="password" required maxLength={4} inputMode="numeric" value={passcodeForm.passcode} onChange={(e) => setPasscodeForm({ ...passcodeForm, passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="input-field text-center text-lg tracking-widest" placeholder="• • • •" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                  <input type="password" required maxLength={4} inputMode="numeric" value={passcodeForm.confirm_passcode} onChange={(e) => setPasscodeForm({ ...passcodeForm, confirm_passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="input-field text-center text-lg tracking-widest" placeholder="• • • •" />
                </div>
              </div>
              <button type="submit" className="btn-primary text-sm w-full sm:w-auto">Set PIN</button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 mb-5">Update your account password. Must be at least 8 characters with uppercase and number.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" required value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" required minLength={8} value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" required value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="input-field" />
                </div>
              </div>
              <button type="submit" className="btn-primary text-sm w-full sm:w-auto">Change Password</button>
            </form>
          </div>
        </div>
      )}

      {/* ========== SHOP TAB ========== */}
      {activeTab === 'shop' && (
        <div className="space-y-4 w-full max-w-2xl">
          {/* Shop Open / Closed toggle */}
          {isAdmin && (
            <div className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${shopOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  {shopOpen ? 'Shop is Open' : 'Shop is Closed'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {shopOpen
                    ? 'Staff can log in and operate normally.'
                    : 'All employees are blocked from accessing this shop.'}
                </p>
              </div>
              <button
                onClick={() => setConfirmShopToggle(true)}
                disabled={togglingShop}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${shopOpen ? 'bg-green-500' : 'bg-red-400'} ${togglingShop ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${shopOpen ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><HiOutlineBuildingStorefront className="w-5 h-5" /> Shop Information</h3>
              {!editingShop && isAdmin && <button onClick={() => setEditingShop(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>}
            </div>

            {editingShop ? (
              <form onSubmit={handleUpdateShop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                    <input type="text" required value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={shopForm.email} onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                    <input type="text" value={shopForm.gst_number} onChange={(e) => setShopForm({ ...shopForm, gst_number: e.target.value })} className="input-field" />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea rows={2} value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary text-sm flex-1 sm:flex-none">Save Shop Details</button>
                  <button type="button" onClick={() => setEditingShop(false)} className="btn-secondary text-sm flex-1 sm:flex-none">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label="Shop Name" value={shopForm.name || 'Not set'} highlight />
                <InfoRow label="Phone" value={shopForm.phone || 'Not set'} />
                <InfoRow label="Email" value={shopForm.email || 'Not set'} />
                <InfoRow label="GST Number" value={shopForm.gst_number || 'Not set'} />
                <div className="col-span-1 sm:col-span-2"><InfoRow label="Address" value={shopForm.address || 'Not set'} /></div>
                <InfoRow label="Status" value={<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Active</span>} />
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'team' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Team Members</h3>
              <p className="text-sm text-gray-500">{staff.length} member{staff.length !== 1 ? 's' : ''} in this shop</p>
            </div>
            <button onClick={() => setShowStaffModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> Add Staff
            </button>
          </div>

          {/* ── Mobile: card list ── */}
          <div className="sm:hidden space-y-3">
            {staff.length === 0 && (
              <div className="rounded-2xl p-8 text-center text-gray-400 text-sm"
                style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
                No team members yet. Add your first staff member.
              </div>
            )}
            {staff.map((m) => (
              <div key={m.id} className="rounded-2xl p-4"
                style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
                {/* Top row: avatar + name + role */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-sm font-semibold">{m.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </div>

                {/* Middle row: status + joined */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                    {m.is_active ? 'Active' : 'Disabled'}
                  </span>
                  {m.joined_at && (
                    <span className="text-xs text-gray-400">Joined {new Date(m.joined_at).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Action row */}
                {m.role !== 'admin' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60">
                    {m.is_active ? (
                      <button
                        onClick={() => handleToggleStaff(m.id, m.is_active)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      >
                        <HiOutlineXCircle className="w-4 h-4" /> Disable
                      </button>
                    ) : shopOpen ? (
                      <button
                        onClick={() => handleToggleStaff(m.id, m.is_active)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                      >
                        <HiOutlineCheckCircle className="w-4 h-4" /> Enable
                      </button>
                    ) : (
                      <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-orange-500 border border-orange-200 bg-orange-50 cursor-not-allowed">
                        <HiOutlineBuildingStorefront className="w-4 h-4" /> Shop Closed
                      </span>
                    )}
                    <button
                      onClick={() => setConfirmDelete({ id: m.id, name: m.name })}
                      className="p-2 rounded-xl text-gray-400 border border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
                      title="Remove from shop"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop: table ── */}
          <div className="hidden sm:block rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(200,207,216,0.2)" }}>
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Member</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Joined</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 text-sm font-medium">{m.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><RoleBadge role={m.role} /></td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-4 text-center">
                      {m.role !== 'admin' && (
                        <div className="flex items-center justify-center gap-2">
                          {m.is_active ? (
                            <button
                              onClick={() => handleToggleStaff(m.id, m.is_active)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                              title="Disable this staff member"
                            >
                              <HiOutlineXCircle className="w-3.5 h-3.5" /> Disable
                            </button>
                          ) : shopOpen ? (
                            <button
                              onClick={() => handleToggleStaff(m.id, m.is_active)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                              title="Enable this staff member"
                            >
                              <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Enable
                            </button>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-orange-500 border border-orange-200 bg-orange-50 cursor-not-allowed"
                              title="Open the shop first to enable staff"
                            >
                              <HiOutlineBuildingStorefront className="w-3.5 h-3.5" /> Shop Closed
                            </span>
                          )}
                          <button
                            onClick={() => setConfirmDelete({ id: m.id, name: m.name })}
                            className="p-1.5 rounded-xl text-gray-400 border border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
                            title="Remove from shop"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No team members yet. Add your first staff member.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== POS & BILLING TAB ========== */}
      {activeTab === 'pos' && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><HiOutlinePrinter className="w-5 h-5" /> Receipt Settings</h3>
            <p className="text-sm text-gray-500 mb-5">Customize what appears on printed receipts.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Header (Shop name/address shown at top)</label>
                <textarea rows={2} value={posSettings.receipt_header} onChange={(e) => setPosSettings({ ...posSettings, receipt_header: e.target.value })} className="input-field" placeholder="Your Shop Name&#10;123 Market Road, City" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer (Thank you message)</label>
                <input type="text" value={posSettings.receipt_footer} onChange={(e) => setPosSettings({ ...posSettings, receipt_footer: e.target.value })} className="input-field" placeholder="Thank you! Visit again." />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><HiOutlineCog6Tooth className="w-5 h-5" /> POS Preferences</h3>
            <div className="space-y-4">
              <ToggleSetting label="Auto-print receipt after checkout" description="Automatically open print dialog after each sale" checked={posSettings.auto_print} onChange={(v) => setPosSettings({ ...posSettings, auto_print: v })} />
              <ToggleSetting label="Sound effects" description="Play sounds for scan, checkout, and errors" checked={posSettings.sound_enabled} onChange={(v) => setPosSettings({ ...posSettings, sound_enabled: v })} />
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Tax Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
                <input type="number" step="0.01" defaultValue="5" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Label</label>
                <input type="text" defaultValue="GST" className="input-field" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== NOTIFICATIONS TAB ========== */}
      {activeTab === 'notifications' && (
        <div className="card w-full max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><HiOutlineBell className="w-5 h-5" /> Notification Preferences</h3>
          <p className="text-sm text-gray-500 mb-6">Choose what alerts you want to receive.</p>
          <div className="space-y-4">
            <ToggleSetting label="Low stock alerts" description="Get notified when items fall below minimum stock level" checked={true} onChange={() => {}} />
            <ToggleSetting label="Daily sales summary" description="Receive end-of-day sales report" checked={true} onChange={() => {}} />
            <ToggleSetting label="New staff login" description="Alert when a staff member logs into the shop" checked={false} onChange={() => {}} />
            <ToggleSetting label="Large transactions" description="Notify for transactions above a threshold" checked={false} onChange={() => {}} />
            <ToggleSetting label="Expiry reminders" description="Alert for products nearing expiry date" checked={true} onChange={() => {}} />
          </div>
        </div>
      )}


      {/* ========== LOGIN LOGS TAB ========== */}
      {activeTab === 'logs' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <input
              type="date"
              value={logsDate}
              onChange={(e) => setLogsDate(e.target.value)}
              className="input-field w-auto"
            />
            {logsLoading && (
              <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            )}
          </div>

          <div className="rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
            {/* ── Mobile: card list ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {!logsLoading && logs.length === 0 && (
                <p className="px-5 py-12 text-center text-sm text-gray-400">No login activity for this date.</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{log.user_name}</p>
                    <RoleBadge role={log.role} />
                  </div>
                  <p className="text-xs text-gray-400">{log.user_email}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <HiOutlineClock className="w-3.5 h-3.5 text-green-500" />
                      {new Date(log.login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.logout_at ? (
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="w-3.5 h-3.5 text-red-400" />
                        {new Date(log.logout_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </span>
                    )}
                    {log.duration_minutes != null && (
                      <span className="text-gray-400">{log.duration_minutes}m session</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop: table ── */}
            <table className="hidden sm:table w-full text-sm">
              <thead style={{ background: 'rgba(200,207,216,0.2)' }}>
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Staff Member</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Login At</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Logout At</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-14 text-center">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-14 text-center text-sm text-gray-400">
                      No login activity for this date.
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{log.user_name}</p>
                      <p className="text-xs text-gray-400">{log.user_email}</p>
                    </td>
                    <td className="px-5 py-4"><RoleBadge role={log.role} /></td>
                    <td className="px-5 py-4 text-gray-700 tabular-nums">
                      {new Date(log.login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-gray-500 tabular-nums">
                      {log.logout_at
                        ? new Date(log.logout_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Still active</span>}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-500">
                      {log.duration_minutes != null ? `${log.duration_minutes} min` : '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {log.logout_at
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Logged out</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Online</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {logs.length > 0 && (
                <tfoot style={{ background: 'rgba(200,207,216,0.1)', borderTop: '1px solid rgba(200,207,216,0.3)' }}>
                  <tr>
                    <td colSpan="4" className="px-5 py-3 text-xs text-gray-500">
                      {logs.length} session{logs.length !== 1 ? 's' : ''} on {logsDate}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-medium text-gray-700">
                      {(() => {
                        const total = logs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
                        return total > 0 ? `${total} min total` : '—';
                      })()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========== SHOP TOGGLE CONFIRMATION MODAL ========== */}
      <Modal open={confirmShopToggle} onClose={() => setConfirmShopToggle(false)} title={shopOpen ? 'Close Shop for the Day?' : 'Open Shop for the Day?'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure to <span className="font-semibold text-gray-900">{shopOpen ? 'close' : 'open'}</span> the shop for the day!
          </p>
          <p className="text-xs text-gray-400">
            {shopOpen
              ? 'All staff members will be blocked from accessing this shop until you reopen it.'
              : 'Staff members will be able to log in and operate normally.'}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setConfirmShopToggle(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleToggleShopStatus}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${shopOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {shopOpen ? 'Yes, Close Shop' : 'Yes, Open Shop'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Permanently Remove Team Member!">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to remove <span className="font-semibold text-gray-900">{confirmDelete?.name}</span> from this shop?
          </p>
          <p className="text-xs text-gray-400">
            This only removes them from your shop. Their account and data remain intact.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleDeleteStaff}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Yes, Remove
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== ADD STAFF MODAL ========== */}
      <Modal open={showStaffModal} onClose={() => { setShowStaffModal(false); setExistingAccount(null); setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' }); }} title="Add Team Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <div className="relative">
              <input
                type="email" required
                value={staffForm.email}
                onChange={(e) => { setStaffForm({ ...staffForm, email: e.target.value }); setExistingAccount(null); }}
                onBlur={(e) => handleEmailBlur(e.target.value)}
                className="input-field"
                placeholder="staff@example.com"
              />
              {checkingEmail && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>

          {/* Existing account notice */}
          {existingAccount?.exists && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p><span className="font-semibold">This Email is already registered!</span> They'll be added to this shop using their existing credentials — no new password needed.</p>
                <p className="mt-1 font-medium">Select Role to continue or Change the email !</p>
              </div>
            </div>
          )}

          {/* Name — prefilled and read-only for existing accounts */}
          {!existingAccount?.exists && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="input-field" placeholder="Staff name" />
            </div>
          )}

          {/* Password — only for new accounts */}
          {!existingAccount?.exists && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" required minLength={8} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="input-field" placeholder="Min 8 chars, 1 upper, 1 number" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!existingAccount?.exists && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="input-field" />
              </div>
            )}
            <div className={existingAccount?.exists ? 'col-span-1 sm:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className="input-field">
                <option value="staff">Salesperson / Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
            Staff members can access POS, products, and inventory. Only admins can manage settings and team.
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowStaffModal(false); setExistingAccount(null); setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' }); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : existingAccount?.exists ? 'Add to Shop' : 'Add Member'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ========== HELPER COMPONENTS ========== */

function InfoRow({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`${highlight ? 'text-lg font-semibold' : ''} text-gray-900`}>{value}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-gray-100 text-gray-700' };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[role] || colors.staff}`}>{labels[role] || role}</span>;
}

function ToggleSetting({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
