import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineBell, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { logout } from '../../store/authSlice';

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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
        <h1 className="text-lg font-semibold text-gray-800 hidden md:block">
          Welcome back, {user?.name || 'User'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
          aria-label="Notifications"
        >
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.name || 'User'}
          </span>
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
