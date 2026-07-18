import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  HiOutlineCreditCard,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineXMark,
  HiOutlineBars3,
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { logout } from '../store/authSlice';

const adminNav = [
  { name: 'Shops', href: '/admin/shops', icon: HiOutlineBuildingStorefront },
  { name: 'Users', href: '/admin/users', icon: HiOutlineUserGroup },
  { name: 'Subscription', href: '/admin/subscription', icon: HiOutlineCreditCard },
  { name: 'Login Logs', href: '/admin/logs', icon: HiOutlineClipboardDocumentList },
  { name: 'Settings', href: '/admin/settings', icon: HiOutlineCog6Tooth },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#e8edf5' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-out md:relative md:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#e8edf5', boxShadow: '6px 0 12px #c8cfd8' }}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between h-16 px-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,207,216,0.4)' }}>
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="MyPA Logo"
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
              style={{ boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            />
            <div>
              <span className="text-lg font-bold text-gray-800 tracking-tight">MyPA</span>
              <p className="text-[10px] text-primary-600 font-semibold uppercase tracking-wider">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
            style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
            aria-label="Close sidebar"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Administration
          </p>
          {adminNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive ? 'text-primary-700' : 'text-gray-600 hover:text-gray-900'
                }`
              }
              style={({ isActive }) => isActive ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' } : {}}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(200,207,216,0.4)' }}>
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>
              <span className="text-primary-700 text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10" style={{ background: '#e8edf5', boxShadow: '0 4px 8px rgba(200,207,216,0.6)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-700 transition-all"
              style={{ boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
              aria-label="Open menu"
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Admin Panel (Business Owner)</h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">Manage subscription & users</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 transition-all"
              style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
              title="Logout"
              aria-label="Logout"
            >
              <HiOutlineArrowLeftOnRectangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
