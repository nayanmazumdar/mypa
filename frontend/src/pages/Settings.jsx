import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineBuildingStorefront, HiOutlineUserGroup,
  HiOutlinePlus, HiOutlineShieldCheck, HiOutlineCog6Tooth,
  HiOutlinePrinter, HiOutlineBell, HiOutlineReceiptPercent,
  HiOutlinePencil, HiOutlineXMark, HiOutlineBanknotes,
} from 'react-icons/hi2';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Settings() {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingShop, setEditingShop] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff', designation: '' });
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [shopForm, setShopForm] = useState({ name: '', address: '', phone: '', email: '', gst_number: '' });
  const [passcodeForm, setPasscodeForm] = useState({ passcode: '', confirm_passcode: '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [posSettings, setPosSettings] = useState({ receipt_header: '', receipt_footer: '', auto_print: false, sound_enabled: true });

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (activeTab === 'team') loadStaff(); }, [activeTab]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setProfileForm({ name: res.data.name || '', phone: res.data.phone || '' });
      setShopForm({
        name: res.data.shops?.[0]?.name || user?.shop_name || '',
        address: res.data.shops?.[0]?.address || '',
        phone: res.data.shops?.[0]?.phone || '',
        email: res.data.shops?.[0]?.email || res.data.email || '',
        gst_number: res.data.shops?.[0]?.gst_number || '',
      });
    } catch {}
  };

  const loadStaff = async () => {
    try { const res = await api.get('/auth/staff'); setStaff(res.data); } catch {}
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

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/staff', staffForm);
      toast.success('Staff member added');
      setShowStaffModal(false);
      setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff', designation: '' });
      loadStaff();
    } catch (err) { toast.error(err.structured?.message || 'Failed to add staff'); }
    finally { setLoading(false); }
  };

  const handleToggleStaff = async (id, active, name) => {
    const action = active ? 'disable' : 'enable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}? They will ${active ? 'lose' : 'regain'} access to this shop.`)) return;
    try {
      await api.patch(`/users/${id}/status`, { is_active: !active });
      toast.success(`${name} ${active ? 'disabled' : 'enabled'}`);
      loadStaff();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update status');
    }
  };

  // ── Edit staff details ───────────────────────────────────────────────
  const [editingDetails, setEditingDetails] = useState(null);
  const [detailsForm, setDetailsForm]       = useState({ name: '', email: '', phone: '' });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showResetPwd, setShowResetPwd]     = useState(false);
  const [newPassword, setNewPassword]       = useState('');
  const [resetLoading, setResetLoading]     = useState(false);

  const openEditDetails = (m) => {
    setEditingDetails(m);
    setDetailsForm({ name: m.name || '', email: m.email || '', phone: m.phone || '' });
    setShowResetPwd(false);
    setNewPassword('');
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setDetailsLoading(true);
    try {
      await api.patch(`/users/${editingDetails.id}/details`, detailsForm);
      toast.success(`${editingDetails.name}'s details updated`);
      setEditingDetails(null);
      loadStaff();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { toast.error('Min 8 characters required'); return; }
    setResetLoading(true);
    try {
      await api.patch(`/users/${editingDetails.id}/reset-password`, { new_password: newPassword });
      toast.success(`Password reset for ${editingDetails.name}`);
      setShowResetPwd(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };
  const [editingRole, setEditingRole] = useState(null); // { id, name, role, designation }
  const [roleForm, setRoleForm]       = useState({ role: 'staff', designation: '' });
  const [roleLoading, setRoleLoading] = useState(false);

  const openEditRole = (m) => {
    setEditingRole(m);
    setRoleForm({ role: m.role || 'staff', designation: m.designation || '' });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setRoleLoading(true);
    try {
      await api.patch(`/users/${editingRole.id}/role`, roleForm);
      toast.success(`${editingRole.name}'s role updated`);
      setEditingRole(null);
      loadStaff();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: HiOutlineUser,               active: 'border-violet-500 text-violet-700 bg-violet-50',   hover: 'hover:text-violet-600 hover:border-violet-300' },
    { id: 'security',      label: 'Security',      icon: HiOutlineShieldCheck,         active: 'border-rose-500 text-rose-700 bg-rose-50',         hover: 'hover:text-rose-600 hover:border-rose-300' },
    { id: 'shop',          label: 'Shop Details',  icon: HiOutlineBuildingStorefront,  active: 'border-amber-500 text-amber-700 bg-amber-50',      hover: 'hover:text-amber-600 hover:border-amber-300' },
    ...(isAdmin ? [{ id: 'team', label: 'Staff',   icon: HiOutlineUserGroup,           active: 'border-indigo-500 text-indigo-700 bg-indigo-50',   hover: 'hover:text-indigo-600 hover:border-indigo-300' }] : []),
    { id: 'pos',           label: 'POS & Billing', icon: HiOutlineReceiptPercent,      active: 'border-emerald-500 text-emerald-700 bg-emerald-50', hover: 'hover:text-emerald-600 hover:border-emerald-300' },
    { id: 'notifications', label: 'Notifications', icon: HiOutlineBell,                active: 'border-sky-500 text-sky-700 bg-sky-50',            hover: 'hover:text-sky-600 hover:border-sky-300' },
  ];

  if (!profile) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account, shop, team, and preferences</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 border-b border-gray-200 w-fit min-w-max">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px rounded-t-md ${
                activeTab === tab.id
                  ? tab.active
                  : `border-transparent text-gray-500 ${tab.hover}`
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== PROFILE TAB ========== */}
      {activeTab === 'profile' && (
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><HiOutlineUser className="w-5 h-5" /> Profile</h3>
            {!editingProfile && <button onClick={() => setEditingProfile(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>}
          </div>

          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm">Save</button>
                <button type="button" onClick={() => setEditingProfile(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InfoRow label="Full Name" value={profile.name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone || 'Not set'} />
              <InfoRow label="Role" value={<RoleBadge role={profile.role} />} />
              <InfoRow label="Member Since" value={new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoRow label="Account Status" value={<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>} />
            </div>
          )}
        </div>
      )}

      {/* ========== SECURITY TAB ========== */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-6">
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
              <button type="submit" className="btn-primary text-sm">Set PIN</button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" required minLength={8} value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" required value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="input-field" />
                </div>
              </div>
              <button type="submit" className="btn-primary text-sm">Change Password</button>
            </form>
          </div>
        </div>
      )}

      {/* ========== SHOP TAB ========== */}
      {activeTab === 'shop' && (
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><HiOutlineBuildingStorefront className="w-5 h-5" /> Shop Information</h3>
            {!editingShop && isAdmin && <button onClick={() => setEditingShop(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>}
          </div>

          {editingShop ? (
            <form onSubmit={handleUpdateShop} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea rows={2} value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm">Save Shop Details</button>
                <button type="button" onClick={() => setEditingShop(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InfoRow label="Shop Name" value={shopForm.name || 'Not set'} highlight />
              <InfoRow label="Phone" value={shopForm.phone || 'Not set'} />
              <InfoRow label="Email" value={shopForm.email || 'Not set'} />
              <InfoRow label="GST Number" value={shopForm.gst_number || 'Not set'} />
              <div className="md:col-span-2"><InfoRow label="Address" value={shopForm.address || 'Not set'} /></div>
              <InfoRow label="Status" value={<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Active</span>} />
            </div>
          )}
        </div>
      )}

      {/* ========== TEAM TAB ========== */}
      {activeTab === 'team' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Staff Members</h3>
              <p className="text-sm text-gray-500">{staff.length} member{staff.length !== 1 ? 's' : ''} in this shop</p>
            </div>
            <button onClick={() => setShowStaffModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> Add Staff
            </button>
          </div>

          {/* ── Salary reminder banner ── */}
          {(() => {
            const today   = new Date();
            const day     = today.getDate();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const daysLeft = lastDay - day;
            const monthName = today.toLocaleString('en-IN', { month: 'long' });

            if (daysLeft === 0) {
              // Last day — urgent
              return (
                <div className="flex items-start gap-3 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 shadow-sm">
                  <span className="relative flex h-6 w-6 shrink-0 mt-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <HiOutlineBanknotes className="relative w-6 h-6 text-red-600" />
                  </span>
                  <div>
                    <p className="font-bold text-red-700 text-sm">Today is the last day of {monthName}!</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Don't forget to process salary payments for your {staff.filter(s => s.role !== 'admin').length} staff member{staff.filter(s => s.role !== 'admin').length !== 1 ? 's' : ''} before the month ends.
                    </p>
                  </div>
                </div>
              );
            }

            if (daysLeft <= 3) {
              // Last 3 days — warning
              return (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                  <HiOutlineBanknotes className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left in {monthName}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Salary due soon — remember to pay your staff before the month ends.
                    </p>
                  </div>
                </div>
              );
            }

            // Not near end of month — soft reminder
            return (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5">
                  <HiOutlineBanknotes className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <p className="text-xs text-indigo-600">
                    Pay day ahead — <span className="font-bold text-indigo-700">{lastDay} {monthName}</span> is {daysLeft} days away.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 text-sm font-medium">{m.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                          {m.designation && (
                            <p className="text-xs text-purple-600 font-medium mt-0.5">{m.designation}</p>
                          )}
                          {(m.shop_name || user?.shop_name) && (
                            <p className="text-xs text-indigo-500 font-medium mt-0.5 flex items-center gap-1">
                              <HiOutlineBuildingStorefront className="w-3 h-3" />
                              {m.shop_name || user?.shop_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.designation
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{m.designation}</span>
                        : <RoleBadge role={m.role} />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {m.role !== 'admin' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditDetails(m)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1">
                            <HiOutlinePencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => openEditRole(m)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors flex items-center gap-1">
                            <HiOutlinePencil className="w-3 h-3" /> Edit Role
                          </button>
                          <button
                            onClick={() => !m.is_active && handleToggleStaff(m.id, m.is_active, m.name)}
                            disabled={m.is_active}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              m.is_active
                                ? 'border-blue-100 text-blue-300 bg-blue-50 cursor-default'
                                : 'border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400'
                            }`}>
                            Enable
                          </button>
                          <button
                            onClick={() => m.is_active && handleToggleStaff(m.id, m.is_active, m.name)}
                            disabled={!m.is_active}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              !m.is_active
                                ? 'border-red-100 text-red-300 bg-red-50 cursor-default'
                                : 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
                            }`}>
                            Disable
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
        <div className="max-w-2xl space-y-6">
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
            <div className="grid grid-cols-2 gap-4">
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
        <div className="card max-w-2xl">
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

      {/* ========== EDIT STAFF DETAILS MODAL ========== */}
      <Modal open={!!editingDetails} onClose={() => setEditingDetails(null)} title="Edit Staff Details">
        {editingDetails && (
          <div className="space-y-4">
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text" required
                  value={detailsForm.name}
                  onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" required
                  value={detailsForm.email}
                  onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={detailsForm.phone}
                  onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditingDetails(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={detailsLoading} className="btn-primary">
                  {detailsLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Reset Password section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Reset Password</p>
                <button
                  type="button"
                  onClick={() => { setShowResetPwd(v => !v); setNewPassword(''); }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium underline hover:no-underline"
                >
                  {showResetPwd ? 'Cancel' : 'Reset password'}
                </button>
              </div>
              {showResetPwd && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetLoading || newPassword.length < 8}
                    className="btn-primary text-sm px-4 disabled:opacity-50"
                  >
                    {resetLoading ? '…' : 'Set'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========== EDIT ROLE MODAL ========== */}
      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} title="Edit Role & Designation">
        {editingRole && (
          <form onSubmit={handleSaveRole} className="space-y-4">
            {/* Member info */}
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-700 text-sm font-medium">{editingRole.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{editingRole.name}</p>
                <p className="text-xs text-gray-400">{editingRole.email}</p>
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <select
                value={roleForm.designation}
                onChange={(e) => {
                  const val = e.target.value;
                  const sysRole = val === 'General Manager' ? 'manager' : 'staff';
                  setRoleForm({ ...roleForm, designation: val, role: sysRole });
                }}
                className="input-field"
              >
                <option value="">Select designation…</option>
                <optgroup label="Management">
                  <option value="General Manager">General Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                </optgroup>
                <optgroup label="Sales & Support">
                  <option value="Cashier">Cashier</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Customer Support">Customer Support</option>
                </optgroup>
                <optgroup label="Operations">
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Purchase Executive">Purchase Executive</option>
                  <option value="Warehouse Staff">Warehouse Staff</option>
                  <option value="Delivery Staff">Delivery Staff</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Security">Security</option>
                </optgroup>
              </select>
            </div>

            {/* System role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Access Level</label>
              <select
                value={roleForm.role}
                onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                className="input-field"
              >
                <option value="staff">Staff — standard access (POS, products, inventory)</option>
                <option value="manager">Manager — elevated access</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setEditingRole(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={roleLoading} className="btn-primary">
                {roleLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========== ADD STAFF MODAL ========== */}
      <Modal open={showStaffModal} onClose={() => setShowStaffModal(false)} title="Add Staff Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
          {/* Shop context — read-only info row */}
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
            <HiOutlineBuildingStorefront className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-700 truncate">
                {user?.shop_name || shopForm.name || 'Current Shop'}
              </p>
              {user?.shop_id && (
                <p className="text-[10px] text-indigo-400 mt-0.5">Shop ID: {user.shop_id}</p>
              )}
            </div>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full shrink-0">
              Adding to this shop
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="input-field" placeholder="Staff name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="input-field" placeholder="staff@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" required minLength={8} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="input-field" placeholder="Min 8 chars, 1 upper, 1 number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <select
                value={staffForm.designation}
                onChange={(e) => {
                  const val = e.target.value;
                  // Map designation to system role: General Manager → manager, else → staff
                  const sysRole = val === 'General Manager' ? 'manager' : 'staff';
                  setStaffForm({ ...staffForm, designation: val, role: sysRole });
                }}
                className="input-field"
              >
                <option value="">Select designation…</option>
                <optgroup label="Management">
                  <option value="General Manager">General Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                </optgroup>
                <optgroup label="Sales & Support">
                  <option value="Cashier">Cashier</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Customer Support">Customer Support</option>
                </optgroup>
                <optgroup label="Operations">
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Purchase Executive">Purchase Executive</option>
                  <option value="Warehouse Staff">Warehouse Staff</option>
                  <option value="Delivery Staff">Delivery Staff</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Security">Security</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
            Staff members can access POS, products, and inventory. Only admins can manage settings and team.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowStaffModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Member'}</button>
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
