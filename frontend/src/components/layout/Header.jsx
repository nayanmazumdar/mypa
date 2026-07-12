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
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10" style={{ background: '#e8edf5', boxShadow: '0 4px 8px rgba(200,207,216,0.6)' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-700 transition-all"
          style={{ boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
          aria-label="Open menu"
        >
          <HiOutlineBars3 className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-800">{user?.shop_name || 'My Shop'}</h1>
          <p className="text-[11px] text-gray-400 hidden sm:block">Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch Shop */}
        {user?.shops?.length > 1 && (
          <button
            onClick={handleSwitchShop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 transition-all"
            style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            title="Switch Shop"
          >
            <HiOutlineArrowsRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 transition-all"
          style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
          title="Logout"
          aria-label="Logout"
        >
          <HiOutlineArrowRightOnRectangle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
