import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineShieldCheck, HiOutlineBell,
  HiOutlineFingerPrint, HiOutlineLockClosed,
  HiOutlineCheckBadge, HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '../api/axios';
import { LoadingSpinner } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: HiOutlineUser },
  { id: 'security', label: 'Security', icon: HiOutlineShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: HiOutlineBell },
];

export default function Settings() {
  usePageTitle('Settings');
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get('tab') || 'profile';
  const [activeSection, setActiveSection] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', area: '', pincode: '' });
  const [passcodeForm, setPasscodeForm] = useState({ passcode: '', confirm_passcode: '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setProfileForm({ name: res.data.name || '', phone: res.data.phone || '', area: res.data.area || '', pincode: res.data.pincode || '000000' });
    } catch {}
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.pincode || profileForm.pincode.length !== 6) {
      toast.error('PIN Code is mandatory (6 digits)');
      return;
    }
    try {
      await api.put('/auth/profile', profileForm);
      toast.success('Profile updated');
      setEditingProfile(false);
      loadProfile();
    } catch (err) { toast.error(err.structured?.message || 'Failed to update'); }
  };

  const handleSetPasscode = async (e) => {
    e.preventDefault();
    if (passcodeForm.passcode !== passcodeForm.confirm_passcode) { toast.error('Passcodes do not match'); return; }
    if (!/^\d{4}$/.test(passcodeForm.passcode)) { toast.error('Must be exactly 4 digits'); return; }
    try {
      await api.post('/auth/set-passcode', { passcode: passcodeForm.passcode, current_password: passcodeForm.current_password });
      toast.success('PIN set successfully');
      setPasscodeForm({ passcode: '', confirm_passcode: '', current_password: '' });
      const saved = localStorage.getItem('remembered_account');
      if (saved) { const acc = JSON.parse(saved); acc.has_passcode = true; localStorage.setItem('remembered_account', JSON.stringify(acc)); }
    } catch (err) { toast.error(err.structured?.message || 'Failed to set PIN'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('Passwords do not match'); return; }
    if (passwordForm.new_password.length < 8) { toast.error('Min 8 characters required'); return; }
    try {
      await api.post('/auth/change-password', { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      toast.success('Password changed');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.structured?.message || 'Failed'); }
  };

  if (!profile) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, security, and preferences</p>
      </div>

      {/* Logged-in user identity banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={NEO.raised}
      >
        {/* Avatar / initials */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={NEO.inset}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary-700 text-base font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{user?.name || profile.name}</p>
          <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>
        </div>

        {/* Active / inactive status */}
        {profile.is_active ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 flex-shrink-0"
            title="Account not yet verified"
          >
            <HiOutlineExclamationCircle className="w-3.5 h-3.5" />
            Unverified
          </span>
        )}
      </div>

      {/* Layout: side nav + content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Side navigation */}
        <nav className="flex md:flex-col gap-2 md:w-48 flex-shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === s.id ? 'text-primary-700' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={activeSection === s.id ? NEO.inset : NEO.raised}
            >
              <s.icon className="w-4 h-4 flex-shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && <ProfileSection profile={profile} editing={editingProfile} setEditing={setEditingProfile} form={profileForm} setForm={setProfileForm} onSubmit={handleUpdateProfile} />}
          {activeSection === 'security' && <SecuritySection passcodeForm={passcodeForm} setPasscodeForm={setPasscodeForm} onSetPasscode={handleSetPasscode} passwordForm={passwordForm} setPasswordForm={setPasswordForm} onChangePassword={handleChangePassword} />}
          {activeSection === 'notifications' && <NotificationsSection />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PROFILE SECTION                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ProfileSection({ profile, editing, setEditing, form, setForm, onSubmit }) {
  return (
    <div className="rounded-2xl p-6" style={NEO.raised}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineUser className="w-5 h-5 text-primary-600" /> My Profile
        </h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg transition-all" style={NEO.raised}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Area / Locality" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="Street, Area, City" />
            <Field label="PIN Code *" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" maxLength={6} placeholder="6-digit (mandatory)" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">Save Changes</button>
            <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition-all" style={NEO.raised}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoCard label="Full Name" value={profile.name} />
          <InfoCard label="Email" value={profile.email} />
          <InfoCard label="Phone" value={profile.phone || '—'} />
          <InfoCard label="Role" value={profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)} />
          <InfoCard label="Area" value={profile.area || '—'} />
          <InfoCard label="PIN Code" value={profile.pincode || '—'} />
          <InfoCard label="Member Since" value={new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SECURITY SECTION                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function SecuritySection({ passcodeForm, setPasscodeForm, onSetPasscode, passwordForm, setPasswordForm, onChangePassword }) {
  return (
    <div className="space-y-6">
      {/* Quick PIN */}
      <div className="rounded-2xl p-6" style={NEO.raised}>
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
          <HiOutlineFingerPrint className="w-5 h-5 text-primary-600" /> Quick Login PIN
        </h3>
        <p className="text-xs text-gray-500 mb-5">Set a 4-digit PIN for faster login without typing your full password.</p>
        <form onSubmit={onSetPasscode} className="space-y-4">
          <Field label="Current Password" type="password" required value={passcodeForm.current_password} onChange={(v) => setPasscodeForm({ ...passcodeForm, current_password: v })} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="New PIN" type="password" required maxLength={4} inputMode="numeric" value={passcodeForm.passcode} onChange={(v) => setPasscodeForm({ ...passcodeForm, passcode: v.replace(/\D/g, '').slice(0, 4) })} className="text-center text-lg tracking-[0.3em]" placeholder="••••" />
            <Field label="Confirm PIN" type="password" required maxLength={4} inputMode="numeric" value={passcodeForm.confirm_passcode} onChange={(v) => setPasscodeForm({ ...passcodeForm, confirm_passcode: v.replace(/\D/g, '').slice(0, 4) })} className="text-center text-lg tracking-[0.3em]" placeholder="••••" />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">Set PIN</button>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl p-6" style={NEO.raised}>
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
          <HiOutlineLockClosed className="w-5 h-5 text-primary-600" /> Change Password
        </h3>
        <p className="text-xs text-gray-500 mb-5">Must be at least 8 characters with a mix of uppercase and numbers.</p>
        <form onSubmit={onChangePassword} className="space-y-4">
          <Field label="Current Password" type="password" required value={passwordForm.current_password} onChange={(v) => setPasswordForm({ ...passwordForm, current_password: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="New Password" type="password" required minLength={8} value={passwordForm.new_password} onChange={(v) => setPasswordForm({ ...passwordForm, new_password: v })} />
            <Field label="Confirm Password" type="password" required value={passwordForm.confirm_password} onChange={(v) => setPasswordForm({ ...passwordForm, confirm_password: v })} />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">Update Password</button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* NOTIFICATIONS SECTION                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function NotificationsSection() {
  return (
    <div className="rounded-2xl p-6" style={NEO.raised}>
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
        <HiOutlineBell className="w-5 h-5 text-primary-600" /> Notifications
      </h3>
      <p className="text-xs text-gray-500 mb-6">Choose what alerts you want to receive.</p>
      <div className="space-y-1">
        <Toggle label="Low stock alerts" desc="Notify when items fall below minimum level" defaultOn />
        <Toggle label="Daily sales summary" desc="End-of-day sales report" defaultOn />
        <Toggle label="New staff login" desc="Alert when staff logs into a shop" />
        <Toggle label="Large transactions" desc="Notify for transactions above threshold" />
        <Toggle label="Expiry reminders" desc="Alert for products nearing expiry" defaultOn />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* REUSABLE COMPONENTS                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Field({ label, value, onChange, type = 'text', className = '', ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-primary-200 ${className}`}
        style={NEO.inset}
        {...props}
      />
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="px-4 py-3 rounded-xl" style={NEO.inset}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function Toggle({ label, desc, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/30 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-primary-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
