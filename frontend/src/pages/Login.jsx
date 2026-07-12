import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser, clearError } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';

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
    const result = await dispatch(loginUser({ email: form.email, passcode: pin }));
    if (loginUser.fulfilled.match(result)) {
      // Remember account for quick login
      localStorage.setItem('remembered_account', JSON.stringify({
        email: result.payload.user.email,
        name: result.payload.user.name,
        has_passcode: result.payload.user.has_passcode,
      }));
      toast.success('Welcome back!');
      navigateAfterLogin();
    } else {
      setPasscode(['', '', '', '']);
      passcodeRefs[0].current?.focus();
      toast.error(result.payload || 'Invalid passcode');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      localStorage.setItem('remembered_account', JSON.stringify({
        email: result.payload.user.email,
        name: result.payload.user.name,
        has_passcode: result.payload.user.has_passcode,
      }));
      toast.success('Welcome back!');
      navigateAfterLogin();
    } else {
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

  const navigateAfterLogin = () => {
    // Always go to shop selector — it handles empty state + add shop
    navigate('/select-shop');
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

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
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
  );
}
