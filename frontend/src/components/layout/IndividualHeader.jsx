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
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{ background: '#e8edf5', boxShadow: '0 4px 8px #c8cfd8' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 transition-all"
          style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
          aria-label="Open menu"
        >
          <HiOutlineBars3 className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-primary-700">Personal Dashboard</h1>
          <p className="text-[11px] text-gray-500">Welcome, {user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User avatar + logout */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt={user?.name || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary-700 text-sm font-semibold">{initials}</span>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-700">{user?.name}</p>
            <p className="text-[10px] text-primary-600 font-medium uppercase tracking-wider">Individual</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-gray-500 hover:text-red-600 transition-all"
            style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            title="Logout"
            aria-label="Logout"
          >
            <HiOutlineArrowRightOnRectangle className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
