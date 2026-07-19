import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser, clearError } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import { getFirstAccessibleRoute } from '../utils/permissions';
import { resolveDefaultRoute } from './RoleSelector';

const LOCKOUT_MINUTES = 15;
const LOCKOUT_KEY = 'login_lockout_until';

export default function Login() {
  usePageTitle('Login');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  // Remember last logged-in account
  const [rememberedAccount, setRememberedAccount] = useState(null);
  const [mode, setMode] = useState('password'); // 'password' | 'passcode' | 'select'
  const [form, setForm] = useState({ email: '', password: '' });
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const passcodeRefs = [useRef(), useRef(), useRef(), useRef()];

  // Rate-limit lockout state
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check for existing lockout on mount and tick countdown
  useEffect(() => {
    const check = () => {
      const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) {
        setLockedOut(true);
        setCountdown(remaining);
      } else {
        setLockedOut(false);
        setCountdown(0);
        localStorage.removeItem(LOCKOUT_KEY);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if we have a remembered account
    const saved = localStorage.getItem('remembered_account');
    if (saved) {
      try {
        const account = JSON.parse(saved);
        setRememberedAccount(account);
        setForm({ ...form, email: account.email });
        // If account has passcode, show passcode entry by default
        if (account.has_passcode) {
          setMode('passcode');
        }
      } catch {
        localStorage.removeItem('remembered_account');
      }
    }
  }, []);

  const handlePasscodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newPasscode = [...passcode];
    newPasscode[index] = value.slice(-1); // Only last digit
    setPasscode(newPasscode);

    // Auto-focus next input
    if (value && index < 3) {
      passcodeRefs[index + 1].current?.focus();
    }

    // Auto-submit when 4 digits entered
    if (index === 3 && value) {
      const pin = newPasscode.join('');
      if (pin.length === 4) {
        handlePasscodeSubmit(pin);
      }
    }
  };

  const handlePasscodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      passcodeRefs[index - 1].current?.focus();
    }
  };

  const handlePasscodeSubmit = async (pin) => {
    if (lockedOut) return;
    const result = await dispatch(loginUser({ email: form.email, passcode: pin }));
    if (loginUser.fulfilled.match(result)) {
      // Remember account for quick login
      localStorage.setItem('remembered_account', JSON.stringify({
        email: result.payload.user.email,
        name: result.payload.user.name,
        has_passcode: result.payload.user.has_passcode,
      }));
      toast.success('Welcome back!');
      navigateAfterLogin(result.payload.user);
    } else {
      if (result.payload?.includes?.('15 minutes') || result.meta?.baseQueryMeta?.status === 429) {
        localStorage.setItem(LOCKOUT_KEY, Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      setPasscode(['', '', '', '']);
      passcodeRefs[0].current?.focus();
      toast.error(result.payload || 'Invalid passcode');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (lockedOut) return;
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      localStorage.setItem('remembered_account', JSON.stringify({
        email: result.payload.user.email,
        name: result.payload.user.name,
        has_passcode: result.payload.user.has_passcode,
      }));
      toast.success('Welcome back!');
      navigateAfterLogin(result.payload.user);
    } else {
      if (result.payload?.includes?.('15 minutes')) {
        localStorage.setItem(LOCKOUT_KEY, Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      toast.error(result.payload || 'Login failed');
    }
  };

  const switchAccount = () => {
    localStorage.removeItem('remembered_account');
    setRememberedAccount(null);
    setMode('password');
    setForm({ email: '', password: '' });
    setPasscode(['', '', '', '']);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) dispatch(clearError());
  };

  const navigateAfterLogin = (user) => {
    // No role yet — first-time setup
    if (!user?.role) {
      navigate('/choose-role');
      return;
    }

    if (user.role === 'individual') {
      navigate(resolveDefaultRoute(user.default_module, 'individual'));
      return;
    }

    // Shop role — if shop already active in this session go to first accessible route
    if (user.shop_id) {
      navigate(getFirstAccessibleRoute(user));
      return;
    }

    // No shop selected — admin goes to admin panel, others to shop selector
    if (user.role === 'admin') {
      navigate('/admin/shops');
    } else {
      navigate('/select-shop');
    }
<<<<<<< HEAD

    // Staff/Manager: auto-select their shop if they have exactly one
    const shops = loginUser.shops || [];
    if (shops.length === 1) {
      // Check if shop is closed or staff is disabled — show modal directly
      if (!shops[0].is_open || shops[0].staff_active === 0) {
        setClosedShops(shops);
        setWaitingUser(loginUser);
        setShowClosedModal(true);
        startPolling(loginUser, shops);
        return;
      }
      try {
        const response = await api.post('/auth/select-shop', { shop_id: shops[0].id });
        const { token, shop: s, role, default_module, log_id } = response.data;
        localStorage.setItem('token', token);
        const updated = { ...loginUser, shop_id: s.id, shop_name: s.name, role, default_module: default_module || loginUser.default_module, log_id };
        localStorage.setItem('user', JSON.stringify(updated));
        dispatch(setActiveShop({ shop_id: s.id, shop_name: s.name, role, default_module: default_module || loginUser.default_module, log_id }));
        navigate(resolveDefaultRoute(updated.default_module, 'shop'));
      } catch (err) {
        const msg = err.structured?.message || err.response?.data?.message || 'Cannot enter shop';
        if (msg.toLowerCase().includes('closed')) {
          // Show modal with closed shops — poll until open
          setClosedShops(shops);
          setWaitingUser(loginUser);
          setShowClosedModal(true);
          startPolling(loginUser, shops);
        } else if (msg.toLowerCase().includes('do not have access') || msg.toLowerCase().includes('disabled')) {
          toast.error('🚫 Your account is currently disabled. Please contact the business owner.');
          dispatch(logout());
          navigate('/login');
        } else {
          toast.error(msg);
          dispatch(logout());
          navigate('/login');
        }
      }
      return;
    }

    // No shops — show modal indicating disabled/unassigned
    if (shops.length === 0) {
      setClosedShops([]);
      setWaitingUser(loginUser);
      setShowClosedModal(true);
      return;
    }

    // Multiple shops — try each, show closed ones in modal if all closed
    const allClosed = shops.every(s => !s.is_open);
    if (allClosed) {
      setClosedShops(shops);
      setWaitingUser(loginUser);
      setShowClosedModal(true);
      startPolling(loginUser, shops);
      return;
    }

    // Some shops open — auto-select the first open one
    const openShop = shops.find(s => s.is_open);
    if (openShop) {
      try {
        const response = await api.post('/auth/select-shop', { shop_id: openShop.id });
        const { token, shop: s, role, default_module, log_id } = response.data;
        localStorage.setItem('token', token);
        const updated = { ...loginUser, shop_id: s.id, shop_name: s.name, role, default_module: default_module || loginUser.default_module, log_id };
        localStorage.setItem('user', JSON.stringify(updated));
        dispatch(setActiveShop({ shop_id: s.id, shop_name: s.name, role, default_module: default_module || loginUser.default_module, log_id }));
        navigate(resolveDefaultRoute(updated.default_module, 'shop'));
      } catch (err) {
        toast.error(err.structured?.message || 'Failed to enter shop');
      }
      return;
    }

    navigate('/admin/shops');
  };

  // Poll for shop open status every 30 seconds
  const startPolling = (staffUser, shops) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const shopToTry = shops[0];
        const response = await api.post('/auth/select-shop', { shop_id: shopToTry.id });
        // Success — shop is now open!
        clearInterval(pollRef.current);
        pollRef.current = null;
        const { token, shop: s, role, default_module, log_id } = response.data;
        localStorage.setItem('token', token);
        const updated = { ...staffUser, shop_id: s.id, shop_name: s.name, role, default_module: default_module || staffUser.default_module, log_id };
        localStorage.setItem('user', JSON.stringify(updated));
        dispatch(setActiveShop({ shop_id: s.id, shop_name: s.name, role, default_module: default_module || staffUser.default_module, log_id }));
        setShowClosedModal(false);
        toast.success(`${s.name} is now open! Entering...`);
        navigate(resolveDefaultRoute(updated.default_module, 'shop'));
      } catch {
        // Still closed — keep polling
      }
    }, 30000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleCloseModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setShowClosedModal(false);
    dispatch(logout());
    navigate('/login');
=======
>>>>>>> 9d9d86bb8f99675240a331a1a442eba09c30bc82
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Passcode entry UI (remembered account with passcode)
  if (rememberedAccount && mode === 'passcode') {
    return (
      <div className="card">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-700 text-xl font-bold">{rememberedAccount.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-1">{rememberedAccount.name}</p>
          <p className="text-gray-400 text-sm">{rememberedAccount.email}</p>
        </div>

        <div className="mb-6">
          <p className="text-center text-sm text-gray-600 mb-4">Enter your 4-digit passcode</p>
          <div className="flex justify-center gap-3">
            {passcode.map((digit, i) => (
              <input
                key={i}
                ref={passcodeRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePasscodeChange(i, e.target.value)}
                onKeyDown={(e) => handlePasscodeKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all" style={{ background: "#e8edf5", boxShadow: "inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff" }}
                autoFocus={i === 0}
              />
            ))}
          </div>
          {loading && (
            <div className="flex justify-center mt-4">
              <span className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center mb-4">{error}</p>}

        {lockedOut && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Too many login attempts</p>
            <p className="text-sm text-red-600">Please try again after 15 minutes</p>
            <p className="text-xs text-red-400 mt-2">Try again in <span className="font-bold">{formatCountdown(countdown)}</span></p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setMode('password')}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            Use password instead
          </button>
          <button
            onClick={switchAccount}
            className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
          >
            Switch account
          </button>
        </div>
      </div>
    );
  }

  // Standard password login
  return (
    <div className="card">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Logo" className="w-14 h-14 rounded-xl mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">
          {rememberedAccount ? 'Enter password' : 'Welcome back'}
        </h2>
        {rememberedAccount ? (
          <p className="text-gray-500 mt-1">{rememberedAccount.email}</p>
        ) : (
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        )}
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        {!rememberedAccount && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              className="input-field" placeholder="you@example.com"
            />
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="password" name="password" type="password" required
            value={form.password} onChange={handleChange}
            className="input-field" placeholder="Enter your password"
            autoFocus={!!rememberedAccount}
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        {lockedOut && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-red-700 mb-1">Too many login attempts</p>
            <p className="text-sm text-red-600">Please try again after 15 minutes</p>
            <p className="text-xs text-red-400 mt-2">Try again in <span className="font-bold">{formatCountdown(countdown)}</span></p>
          </div>
        )}

        <button type="submit" disabled={loading || lockedOut} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign in'}
        </button>
      </form>

      <div className="space-y-3 mt-6">
        {rememberedAccount?.has_passcode && (
          <button onClick={() => { setMode('passcode'); setPasscode(['','','','']); }} className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-1">
            Use passcode instead
          </button>
        )}
        {rememberedAccount && (
          <button onClick={switchAccount} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
            Switch account
          </button>
        )}
        <p className="text-center text-sm text-gray-500">
          No account? <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">Create one</Link>
        </p>
      </div>
    </div>
<<<<<<< HEAD
    </>
  );
}

function ShopClosedModal({ shops, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-500 mt-1">
            {shops.length === 0
              ? 'Your account is not assigned to any shop today! Lets you in when done. Please contact the business owner.'
              : 'Your shop access is currently restricted. You will be automatically redirected when access is restored.'}
          </p>
        </div>

        {/* Shop list */}
        {shops.length > 0 && (
          <div className="space-y-2">
            {shops.map((shop) => {
              const isClosed = !shop.is_open;
              const isDisabled = !shop.staff_active && shop.staff_active !== undefined;
              return (
                <div key={shop.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{shop.name}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isClosed ? 'bg-red-100 text-red-600' : isDisabled ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-red-500' : 'bg-orange-400'}`} />
                    {isClosed ? 'Shop Closed' : isDisabled ? 'Access Disabled' : 'Unavailable'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Waiting indicator */}
        {shops.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="w-3 h-3 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            Checking every 30 seconds...
          </div>
        )}

        {/* Close button */}
        <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
          Go back to Login
        </button>
      </div>
    </div>
=======
>>>>>>> 9d9d86bb8f99675240a331a1a442eba09c30bc82
  );
}
