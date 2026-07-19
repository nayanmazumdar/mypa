import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineBuildingStorefront } from 'react-icons/hi2';
import api from '../api/axios';
import { setActiveShop, logout } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import { getFirstAccessibleRoute } from '../utils/permissions';

export default function SelectShop() {
  usePageTitle('Select Shop');
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(null); // shop id being selected

  const shops = user?.shops || [];

  const handleSelect = async (shop) => {
    if (selecting) return; // prevent double-click
    setSelecting(shop.id);
    try {
      const res = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: s, role, default_module, log_id, rbac_roles, rbac_perms } = res.data;
      localStorage.setItem('token', token);
      const updated = {
        ...user,
        shop_id: s.id,
        shop_name: s.name,
        role,
        default_module: default_module || user?.default_module,
        log_id,
        rbac_roles: rbac_roles || [],
        rbac_perms: rbac_perms || {},
      };
      localStorage.setItem('user', JSON.stringify(updated));
      dispatch(setActiveShop({
        shop_id: s.id, shop_name: s.name, role,
        default_module: default_module || user?.default_module,
        log_id, rbac_roles, rbac_perms,
      }));
      // Navigation is handled by the <Navigate> guard at the top of this component
      // which will fire on re-render once shop_id is set in state
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to select shop');
      setSelecting(null);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // If user already has shop_id (e.g. came here by mistake), redirect
  if (user?.shop_id) {
    return <Navigate to={getFirstAccessibleRoute(user)} replace />;
  }

  if (shops.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
        <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ background: '#e8edf5', boxShadow: '8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff' }}>
          <HiOutlineBuildingStorefront className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">No Shop Assigned</h2>
          <p className="text-sm text-gray-500 mb-6">You haven't been assigned to any shop yet. Contact your admin.</p>
          <button onClick={handleLogout} className="btn-secondary text-sm">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
      <div className="rounded-2xl p-8 max-w-md w-full" style={{ background: '#e8edf5', boxShadow: '8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff' }}>
        <div className="text-center mb-6">
          <HiOutlineBuildingStorefront className="w-10 h-10 text-primary-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-gray-800">Select Shop</h2>
          <p className="text-sm text-gray-500 mt-1">Choose the shop you want to work in</p>
        </div>

        <div className="space-y-3">
          {shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => handleSelect(shop)}
              disabled={!!selecting}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all
                ${selecting === shop.id ? 'opacity-70' : 'hover:scale-[1.01]'}
              `}
              style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                {selecting === shop.id ? (
                  <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                ) : (
                  <HiOutlineBuildingStorefront className="w-5 h-5 text-primary-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{shop.name}</p>
                {shop.address && <p className="text-xs text-gray-400">{shop.address}</p>}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
