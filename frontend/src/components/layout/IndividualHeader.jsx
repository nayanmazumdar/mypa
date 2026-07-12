import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineBars3,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { logout } from '../../store/authSlice';

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Relative paths like /uploads/... work directly via Vite proxy (dev) or same origin (prod)
  return path;
}

export default function IndividualHeader({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'I';
  const profilePic = avatarUrl(user?.avatar);

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
        <div>
          <h1 className="text-base font-semibold text-indigo-700">Personal Dashboard</h1>
          <p className="text-xs text-gray-400">Welcome, {user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* User avatar + logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center">
            {profilePic ? (
              <img
                src={profilePic}
                alt={user?.name || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-indigo-700 text-sm font-medium">{initials}</span>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-indigo-600 font-medium capitalize">Individual</p>
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
