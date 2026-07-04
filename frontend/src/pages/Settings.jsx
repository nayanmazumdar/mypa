import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineBuildingStorefront, HiOutlineUserGroup,
  HiOutlinePlus, HiOutlineShieldCheck, HiOutlineCog6Tooth,
  HiOutlinePrinter, HiOutlineBell, HiOutlineReceiptPercent,
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
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
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
      setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' });
      loadStaff();
    } catch (err) { toast.error(err.structured?.message || 'Failed to add staff'); }
    finally { setLoading(false); }
  };

  const handleToggleStaff = async (id, active) => {
    try { await api.patch(`/users/${id}/status`, { is_active: !active }); toast.success('Updated'); loadStaff(); }
    catch { toast.error('Failed'); }
  };

  const isAdmin = user?.role === 'admin';

  const tabs = [
    { id: 'profile', label: 'Profile', icon: HiOutlineUser },
    { id: 'security', label: 'Security', icon: HiOutlineShieldCheck },
    { id: 'shop', label: 'Shop Details', icon: HiOutlineBuildingStorefront },
    ...(isAdmin ? [{ id: 'team', label: 'Team', icon: HiOutlineUserGroup }] : []),
    { id: 'pos', label: 'POS & Billing', icon: HiOutlineReceiptPercent },
    { id: 'notifications', label: 'Notifications', icon: HiOutlineBell },
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
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
              <h3 className="font-semibold text-gray-900">Team Members</h3>
              <p className="text-sm text-gray-500">{staff.length} member{staff.length !== 1 ? 's' : ''} in this shop</p>
            </div>
            <button onClick={() => setShowStaffModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> Add Staff
            </button>
          </div>

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
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {m.role !== 'admin' && (
                        <button onClick={() => handleToggleStaff(m.id, m.is_active)}
                          className={`text-xs font-medium px-3 py-1 rounded-md ${m.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {m.is_active ? 'Disable' : 'Enable'}
                        </button>
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

      {/* ========== ADD STAFF MODAL ========== */}
      <Modal open={showStaffModal} onClose={() => setShowStaffModal(false)} title="Add Team Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
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
