import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineBuildingStorefront, HiOutlineUserGroup,
  HiOutlinePlus, HiOutlineTrash, HiOutlineShieldCheck,
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
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
  const [shopForm, setShopForm] = useState({ name: '', address: '', phone: '', email: '', gst_number: '' });

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (activeTab === 'team') loadStaff(); }, [activeTab]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setShopForm({
        name: res.data.shop_name || '',
        address: res.data.shop_address || '',
        phone: res.data.shop_phone || '',
        email: res.data.email || '',
        gst_number: res.data.gst_number || '',
      });
    } catch {}
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/auth/staff');
      setStaff(res.data);
    } catch {}
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
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaff = async (id, currentStatus) => {
    try {
      await api.patch(`/users/${id}/status`, { is_active: !currentStatus });
      toast.success('User status updated');
      loadStaff();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const [passcodeForm, setPasscodeForm] = useState({ passcode: '', confirm_passcode: '', current_password: '' });

  const handleSetPasscode = async (e) => {
    e.preventDefault();
    if (passcodeForm.passcode !== passcodeForm.confirm_passcode) {
      toast.error('Passcodes do not match');
      return;
    }
    if (!/^\d{4}$/.test(passcodeForm.passcode)) {
      toast.error('Passcode must be exactly 4 digits');
      return;
    }
    try {
      await api.post('/auth/set-passcode', { passcode: passcodeForm.passcode, current_password: passcodeForm.current_password });
      toast.success('Passcode set! You can now use it to login quickly.');
      setPasscodeForm({ passcode: '', confirm_passcode: '', current_password: '' });
      // Update remembered account
      const saved = localStorage.getItem('remembered_account');
      if (saved) {
        const acc = JSON.parse(saved);
        acc.has_passcode = true;
        localStorage.setItem('remembered_account', JSON.stringify(acc));
      }
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to set passcode');
    }
  };

  const isAdmin = user?.role === 'admin';

  const tabs = [
    { id: 'profile', label: 'Profile', icon: HiOutlineUser },
    { id: 'security', label: 'Security', icon: HiOutlineShieldCheck },
    { id: 'shop', label: 'Shop', icon: HiOutlineBuildingStorefront },
    ...(isAdmin ? [{ id: 'team', label: 'Team', icon: HiOutlineUserGroup }] : []),
  ];

  if (!profile) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account, shop, and team</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <HiOutlineUser className="w-5 h-5" /> Profile Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
              <p className="text-gray-900 font-medium">{profile.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-gray-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <p className="text-gray-900">{profile.phone || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                {profile.role === 'admin' ? 'Shop Owner' : 'Staff'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Member Since</label>
              <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <HiOutlineShieldCheck className="w-5 h-5" /> Quick Login Passcode
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Set a 4-digit PIN for quick login. The system remembers your account — next time just enter your PIN instead of typing your full password.
          </p>

          <form onSubmit={handleSetPasscode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
              <input
                type="password" required value={passcodeForm.current_password}
                onChange={(e) => setPasscodeForm({ ...passcodeForm, current_password: e.target.value })}
                className="input-field" placeholder="Verify your identity"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Passcode (4 digits) *</label>
                <input
                  type="password" required maxLength={4} inputMode="numeric" pattern="[0-9]{4}"
                  value={passcodeForm.passcode}
                  onChange={(e) => setPasscodeForm({ ...passcodeForm, passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="input-field text-center text-lg tracking-widest" placeholder="• • • •"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Passcode *</label>
                <input
                  type="password" required maxLength={4} inputMode="numeric" pattern="[0-9]{4}"
                  value={passcodeForm.confirm_passcode}
                  onChange={(e) => setPasscodeForm({ ...passcodeForm, confirm_passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="input-field text-center text-lg tracking-widest" placeholder="• • • •"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
              After setting a passcode, the login screen will show a PIN pad for quick access. You can always switch to password login if needed.
            </div>
            <button type="submit" className="btn-primary">Set Passcode</button>
          </form>
        </div>
      )}

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <HiOutlineBuildingStorefront className="w-5 h-5" /> Shop Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Shop Name</label>
              <p className="text-gray-900 font-medium text-lg">{shopForm.name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contact Email</label>
              <p className="text-gray-900">{shopForm.email || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <p className="text-gray-900">{shopForm.phone || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">GST Number</label>
              <p className="text-gray-900">{shopForm.gst_number || 'Not set'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
              <p className="text-gray-900">{shopForm.address || 'Not set'}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Shop is active
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <HiOutlineUserGroup className="w-5 h-5" /> Team Members
            </h3>
            <button onClick={() => setShowStaffModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> Add Staff
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{member.name}</td>
                    <td className="px-4 py-3 text-gray-500">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>{member.role === 'admin' ? 'Owner' : 'Staff'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{member.is_active ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(member.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStaff(member.id, member.is_active)}
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            member.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {member.is_active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No team members yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal open={showStaffModal} onClose={() => setShowStaffModal(false)} title="Add Staff Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text" required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className="input-field" placeholder="Staff member name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email" required
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              className="input-field" placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password" required minLength={8}
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              className="input-field" placeholder="Min 8 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="input-field" placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="input-field"
              >
                <option value="staff">Staff / Salesperson</option>
                <option value="shopkeeper">Manager</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowStaffModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
