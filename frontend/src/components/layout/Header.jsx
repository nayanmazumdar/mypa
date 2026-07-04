import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineArrowRightOnRectangle, HiOutlineArrowsRightLeft } from 'react-icons/hi2';
import { logout, switchShop } from '../../store/authSlice';

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSwitchShop = () => {
    dispatch(switchShop());
    navigate('/select-shop');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <HiOutlineBars3 className="w-6 h-6" />
        </button>
        {/* Shop name */}
        <div>
          <h1 className="text-base font-semibold text-gray-900">{user?.shop_name || 'My Shop'}</h1>
          <p className="text-xs text-gray-400">Welcome, {user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch Shop */}
        {user?.shops?.length > 1 && (
          <button
            onClick={handleSwitchShop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Switch Shop"
          >
            <HiOutlineArrowsRightLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        )}

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
