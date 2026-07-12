import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineBuildingStorefront } from 'react-icons/hi2';
import api from '../api/axios';
import { loadUser } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ShopSetup() {
  usePageTitle('Shop Setup');
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: user?.email || '', gst_number: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Shop name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/create-shop', form);
      const { token, shop } = response.data;

      // Update localStorage with new token (now includes shop_id)
      localStorage.setItem('token', token);
      const updatedUser = { ...user, shop_id: shop.id, shop_name: shop.name, shops: [...(user.shops || []), { id: shop.id, name: shop.name, user_role: 'admin' }] };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Reload user state
      dispatch(loadUser());

      toast.success('Shop created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
      <div className="w-full max-w-lg">
        <div className="card">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">✓</span>
              <span className="text-sm text-green-700 font-medium">Account</span>
            </div>
            <div className="flex-1 h-0.5 bg-primary-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">2</span>
              <span className="text-sm text-primary-700 font-medium">Shop Setup</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <HiOutlineBuildingStorefront className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Set up your shop</h2>
            <p className="text-gray-500 mt-1 text-sm">Tell us about your business to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" placeholder="e.g. Green Vegetables & Fruits"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Address</label>
              <textarea
                rows={2} value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field" placeholder="Street, Area, City, PIN"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Phone</label>
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field" placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text" value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                  className="input-field" placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="shop@example.com"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Shop & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
