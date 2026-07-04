import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineBuildingStorefront, HiOutlinePlus, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import api from '../api/axios';
import { logout, setActiveShop } from '../store/authSlice';

export default function ShopSelector() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const shops = user?.shops || [];

  const handleSelectShop = async (shop) => {
    try {
      const response = await api.post('/auth/select-shop', { shop_id: shop.id });
      const { token, shop: selectedShop, role } = response.data;

      // Update token and user state with shop context
      localStorage.setItem('token', token);
      const updatedUser = { ...user, shop_id: selectedShop.id, shop_name: selectedShop.name, role };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(setActiveShop({ shop_id: selectedShop.id, shop_name: selectedShop.name, role }));

      toast.success(`Switched to ${selectedShop.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to select shop');
    }
  };

  const handleCreateShop = () => navigate('/create-shop');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Select Your Shop</h1>
          <p className="text-gray-500 text-sm mt-1">Hi {user?.name}, choose a shop to continue</p>
        </div>

        <div className="space-y-3">
          {shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => handleSelectShop(shop)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all text-left"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <HiOutlineBuildingStorefront className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{shop.name}</p>
                <p className="text-xs text-gray-400 truncate">{shop.address || 'No address set'}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize flex-shrink-0">
                {shop.user_role}
              </span>
            </button>
          ))}

          {shops.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <HiOutlineBuildingStorefront className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No shops yet. Create your first shop to get started.</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <button onClick={handleCreateShop} className="btn-primary w-full flex items-center justify-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Create New Shop
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-gray-700">
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
