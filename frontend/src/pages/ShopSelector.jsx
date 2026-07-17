import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBuildingStorefront, HiOutlinePlus, HiOutlineArrowRightOnRectangle, HiOutlineChevronRight } from 'react-icons/hi2';
import api from '../api/axios';
import { logout, setActiveShop } from '../store/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import { resolveDefaultRoute } from './RoleSelector';

export default function ShopSelector() {
  usePageTitle('Select Shop');
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const shops = user?.shops || [];

  // Staff members cannot create or add shops — they can only select an assigned one
  const isStaff = user?.role === 'staff' || (shops.length > 0 && shops.every((s) => s.user_role !== 'admin'));

  // True when the user has shops but none of them are accessible (disabled or closed)
  // Owners (admin role) are never blocked by the closed status — only by disabled
  const allShopsDisabled = shops.length > 0 && shops.every((s) => {
    const isOwner = s.user_role === 'admin';
    return !s.is_active || s.is_active === 0 || (!isOwner && (!s.is_open || s.is_open === 0));
  });

  const [autoLogging, setAutoLogging] = useState(false);

  const handleSelectShop = async (shop) => {
    try {
      const response = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: selectedShop, role, default_module, log_id } = response.data;

      localStorage.setItem('token', token);
      const updatedUser = {
        ...user,
        shop_id: selectedShop.id,
        shop_name: selectedShop.name,
        role,
        default_module: default_module || user?.default_module || null,
        log_id: log_id || null,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(setActiveShop({ shop_id: selectedShop.id, shop_name: selectedShop.name, role, default_module: default_module || user?.default_module || null, log_id: log_id || null }));
      toast.success(`Opened ${selectedShop.name}`);
      const destination = resolveDefaultRoute(updatedUser.default_module, 'shop');
      navigate(destination);
    } catch (err) {
      setAutoLogging(false);
      toast.error(err.structured?.message || 'Failed to select shop');
    }
  };

  // Auto-select the only shop when staff has exactly one active & open assignment
  useEffect(() => {
    const activeShops = shops.filter((s) => (s.is_active && s.is_active !== 0) && (s.is_open && s.is_open !== 0));
    if (isStaff && activeShops.length === 1 && shops.length === 1) {
      setAutoLogging(true);
      handleSelectShop(activeShops[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Show a loading state while auto-selecting
  if (autoLogging) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
            <HiOutlineBuildingStorefront className="w-6 h-6 text-primary-600 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500">Logging you into <span className="font-semibold text-gray-700">{shops[0]?.name}</span>…</p>
        </div>
      </div>
    );
  }

  // All assigned shops are disabled — user cannot log in
  if (allShopsDisabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 text-center mb-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineBuildingStorefront className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-sm text-gray-500">Contact admin for login details!</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">
            {shops.length > 0 ? 'Select Your Shop' : 'Get Started'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {shops.length > 0
              ? `Hi ${user?.name}, choose a shop to continue`
              : `Hi ${user?.name}, Select one business to get into`}
          </p>
        </div>

        {/* Shop List */}
        {shops.length > 0 && (
          <div className="space-y-3 mb-4">
            {shops.map((shop) => {
              const isOwner = shop.user_role === 'admin';
              const disabled = !shop.is_active || shop.is_active === 0;
              const closed = !disabled && (!shop.is_open || shop.is_open === 0);
              // Owners can always enter their shop regardless of open/closed status
              const blocked = disabled || (!isOwner && closed);
              return (
                <button
                  key={shop.id}
                  onClick={() => !blocked && handleSelectShop(shop)}
                  disabled={blocked}
                  className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all text-left group ${blocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: "#e8edf5", boxShadow: "4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff" }}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${blocked ? 'bg-gray-100' : 'bg-primary-100'}`}>
                    <HiOutlineBuildingStorefront className={`w-6 h-6 ${blocked ? 'text-gray-400' : 'text-primary-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{shop.name}</p>
                    <p className="text-xs text-gray-400 truncate">{shop.address || 'No address set'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {disabled ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-500">Disabled</span>
                    ) : (
                      <>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${closed ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${closed ? 'bg-orange-400' : 'bg-green-500'}`} />
                          {closed ? 'Closed' : 'Open'}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {shop.user_role}
                        </span>
                        {!blocked && <HiOutlineChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {shops.length === 0 && (
          <div className="rounded-2xl p-8 text-center mb-4" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineBuildingStorefront className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Business is now close !</h3>
            <p className="text-sm text-gray-500">Contact the business admin you are working in !</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => !isStaff && navigate('/create-shop')}
            disabled={isStaff}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${isStaff ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {!isStaff && <HiOutlinePlus className="w-5 h-5" />}
            {isStaff ? 'Select Your Business' : (shops.length > 0 ? 'Add Another Shop' : 'Create Your Shop')}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
