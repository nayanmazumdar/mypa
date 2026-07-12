import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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

  const handleSelectShop = async (shop) => {
    try {
      const response = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: selectedShop, role } = response.data;

      localStorage.setItem('token', token);
      const updatedUser = { ...user, shop_id: selectedShop.id, shop_name: selectedShop.name, role };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(setActiveShop({ shop_id: selectedShop.id, shop_name: selectedShop.name, role }));
      toast.success(`Opened ${selectedShop.name}`);
      const destination = resolveDefaultRoute(updatedUser.default_module, 'shop');
      navigate(destination);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to select shop');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

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
              : `Hi ${user?.name}, create your first shop to begin`}
          </p>
        </div>

        {/* Shop List */}
        {shops.length > 0 && (
          <div className="space-y-3 mb-4">
            {shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => handleSelectShop(shop)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all text-left group" style={{ background: "#e8edf5", boxShadow: "4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff" }}
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiOutlineBuildingStorefront className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{shop.name}</p>
                  <p className="text-xs text-gray-400 truncate">{shop.address || 'No address set'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {shop.user_role}
                  </span>
                  <HiOutlineChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {shops.length === 0 && (
          <div className="rounded-2xl p-8 text-center mb-4" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineBuildingStorefront className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No shops yet</h3>
            <p className="text-sm text-gray-500">Create your first shop to start managing products, sales, and billing.</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/create-shop')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <HiOutlinePlus className="w-5 h-5" />
            {shops.length > 0 ? 'Add Another Shop' : 'Create Your Shop'}
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
