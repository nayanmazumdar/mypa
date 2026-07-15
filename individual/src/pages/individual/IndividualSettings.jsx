import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineShieldCheck,
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineCalendarDays,
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlineCheckBadge,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { authApi } from '../../api/auth.api';
import { updateUser } from '../../store/authSlice';

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Relative paths like /uploads/... work directly via Vite proxy (dev) or same origin (prod)
  return path;
}

// ─── Avatar upload widget ─────────────────────────────────────────────────
function AvatarUpload({ current, name, onUploaded }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const initials = (name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const displaySrc = preview || avatarUrl(current);

  const handleFile = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP or GIF allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload immediately
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      fd.append('name', name); // keep existing name
      const res = await authApi.updateProfile(fd);
      onUploaded(res.data);
      toast.success('Profile picture updated');
    } catch (err) {
      setPreview(null);
      toast.error(err.structured?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={`relative w-28 h-28 rounded-full ring-4 transition-all cursor-pointer
          ${dragOver ? 'ring-indigo-400 scale-105' : 'ring-indigo-100'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Change profile picture"
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">{initials}</span>
          </div>
        )}

        {/* Camera overlay */}
        <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
          transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
          {uploading
            ? <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <HiOutlineCamera className="w-7 h-7 text-white" />
          }
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5"
      >
        <HiOutlineCamera className="w-3.5 h-3.5" />
        {current || preview ? 'Change photo' : 'Upload photo'}
      </button>
      <p className="text-[11px] text-gray-400">JPEG, PNG, WebP · max 5 MB</p>
    </div>
  );
}

// ─── Editable field row ───────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon, badge }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100/60 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">Not set</span>}</p>
          {badge}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function IndividualSettings() {
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', area: '', pincode: '' });
  const [saving, setSaving] = useState(false);

  const [passcodeForm, setPasscodeForm] = useState({ passcode: '', confirm_passcode: '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setProfileForm({ name: res.data.name || '', phone: res.data.phone || '', area: res.data.area || '', pincode: res.data.pincode || '' });
    } catch {}
  };

  // Called after avatar upload completes — refresh profile + Redux
  const handleAvatarUploaded = (updatedProfile) => {
    setProfile(updatedProfile);
    dispatch(updateUser({ name: updatedProfile.name, avatar: updatedProfile.avatar }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', profileForm.name.trim());
      fd.append('phone', profileForm.phone.trim());
      fd.append('area', profileForm.area.trim());
      fd.append('pincode', profileForm.pincode.trim());
      const res = await authApi.updateProfile(fd);
      const updated = res.data;
      setProfile(updated);
      setProfileForm({ name: updated.name || '', phone: updated.phone || '', area: updated.area || '', pincode: updated.pincode || '' });
      dispatch(updateUser({ name: updated.name, phone: updated.phone, avatar: updated.avatar }));
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPasscode = async (e) => {
    e.preventDefault();
    if (passcodeForm.passcode !== passcodeForm.confirm_passcode) { toast.error('PINs do not match'); return; }
    if (!/^\d{4}$/.test(passcodeForm.passcode)) { toast.error('PIN must be exactly 4 digits'); return; }
    try {
      await api.post('/auth/set-passcode', {
        passcode: passcodeForm.passcode,
        current_password: passcodeForm.current_password,
      });
      toast.success('Quick login PIN set');
      setPasscodeForm({ passcode: '', confirm_passcode: '', current_password: '' });
    } catch (err) { toast.error(err.structured?.message || 'Failed to set PIN'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('Passwords do not match'); return; }
    if (passwordForm.new_password.length < 8) { toast.error('Min 8 characters required'); return; }
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.structured?.message || 'Failed to change password'); }
  };

  const tabs = [
    { id: 'profile',  label: 'Profile',  icon: HiOutlineUser },
    { id: 'security', label: 'Security', icon: HiOutlineShieldCheck },
  ];

  if (!profile) return (
    <div className="flex justify-center py-16">
      <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account, photo and security</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#c8cfd8' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === 'profile' && (
        <div className="space-y-5">

          {/* Avatar + name card */}
          <div className="rounded-2xl p-6" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Left — avatar */}
              <AvatarUpload
                current={profile.avatar}
                name={profile.name}
                onUploaded={handleAvatarUploaded}
              />

              {/* Right — info / edit */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        👤 Individual
                      </span>
                    </div>
                  </div>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <HiOutlinePencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="input-field"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="input-field"
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Area / Locality
                        </label>
                        <input
                          type="text"
                          value={profileForm.area}
                          onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                          className="input-field"
                          placeholder="Street, Area, City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={6}
                          value={profileForm.pincode}
                          onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="input-field"
                          placeholder="6-digit PIN"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-1.5 btn-primary text-sm py-1.5 px-4"
                      >
                        {saving
                          ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <HiOutlineCheck className="w-4 h-4" />
                        }
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setProfileForm({ name: profile.name || '', phone: profile.phone || '', area: profile.area || '', pincode: profile.pincode || '' });
                        }}
                        className="flex items-center gap-1.5 btn-secondary text-sm py-1.5 px-4"
                      >
                        <HiOutlineXMark className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-1">
                    <InfoRow label="Email"       value={profile.email}  icon={HiOutlineEnvelope}
                      badge={profile.is_active
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700"><HiOutlineCheckBadge className="w-3 h-3" />Verified</span>
                        : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700"><HiOutlineExclamationCircle className="w-3 h-3" />Unverified</span>
                      }
                    />
                    <InfoRow label="Phone"       value={profile.phone}  icon={HiOutlinePhone} />
                    <InfoRow label="Area / Locality" value={profile.area}   icon={HiOutlineMapPin} />
                    <InfoRow label="PIN Code"    value={profile.pincode} icon={HiOutlineMapPin} />
                    <InfoRow label="Account ID"  value={profile.uuid?.slice(0, 8).toUpperCase()} icon={HiOutlineIdentification} />
                    <InfoRow
                      label="Member Since"
                      value={new Date(profile.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                      icon={HiOutlineCalendarDays}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Security tab ── */}
      {activeTab === 'security' && (
        <div className="space-y-5">

          {/* Quick login PIN */}
          <div className="rounded-2xl p-6" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              🔢 Quick Login PIN
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Set a 4-digit PIN for faster login next time.
            </p>
            <form onSubmit={handleSetPasscode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passcodeForm.current_password}
                  onChange={(e) => setPasscodeForm({ ...passcodeForm, current_password: e.target.value })}
                  className="input-field"
                  placeholder="Your account password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">New PIN</label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    value={passcodeForm.passcode}
                    onChange={(e) => setPasscodeForm({ ...passcodeForm, passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="input-field text-center text-xl tracking-[0.5em]"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confirm PIN</label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    value={passcodeForm.confirm_passcode}
                    onChange={(e) => setPasscodeForm({ ...passcodeForm, confirm_passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="input-field text-center text-xl tracking-[0.5em]"
                    placeholder="••••"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary text-sm">Set PIN</button>
            </form>
          </div>

          {/* Change password */}
          <div className="rounded-2xl p-6" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              🔒 Change Password
            </h3>
            <p className="text-sm text-gray-500 mb-5">Must be at least 8 characters.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary text-sm">Change Password</button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
