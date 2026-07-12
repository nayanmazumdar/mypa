import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerUser } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import TermsModal from '../components/common/TermsModal';

export default function Register() {
  usePageTitle('Create Account');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Need an uppercase letter';
    else if (!/\d/.test(form.password)) e.password = 'Need a number';
    if (!termsAccepted) e.terms = 'You must accept the Terms & Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      // Role is not set yet — send to role picker on first login
      toast.success('Account created! Please choose your account type.');
      navigate('/choose-role');
    } else {
      toast.error(result.payload || 'Registration failed');
    }
  };

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-700 text-xl font-bold">M</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="text-gray-500 mt-1 text-sm">Get started with myPA in minutes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`input-field ${errors.name ? 'border-red-300 focus:ring-red-200' : ''}`}
            placeholder="Your full name"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`input-field ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input
            type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-field"
            placeholder="9876543210 (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={`input-field ${errors.password ? 'border-red-300 focus:ring-red-200' : ''}`}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
          />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        {/* Terms & Conditions */}
        <div className="flex flex-col items-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setErrors((prev) => ({ ...prev, terms: undefined }));
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="text-primary-600 font-medium hover:text-primary-700 underline underline-offset-2"
              >
                Terms &amp; Conditions
              </button>
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red-500 mt-1">{errors.terms}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
      </p>

      {/* Terms modal */}
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
}
