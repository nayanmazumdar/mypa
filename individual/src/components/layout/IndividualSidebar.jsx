import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineXMark,
  HiOutlineUser,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';

const navigation = [
  { name: 'Dashboard',   href: '/',          icon: HiOutlineHome,                  end: true },
  { name: 'My Income',   href: '/income',    icon: HiOutlineArrowTrendingUp },
  { name: 'My Expenses', href: '/expenses',  icon: HiOutlineArrowTrendingDown },
  { name: 'My Tasks',    href: '/tasks',     icon: HiOutlineClipboardDocumentList },
  { name: 'My Notes',    href: '/notes',     icon: HiOutlinePencilSquare },
  { name: 'Reports',     href: '/report',    icon: HiOutlineChartBarSquare },
  { name: 'Settings',    href: '/settings',  icon: HiOutlineCog6Tooth },
];

export default function IndividualSidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-out md:relative md:translate-x-0 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#e8edf5', boxShadow: '6px 0 12px #c8cfd8' }}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between h-16 px-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,207,216,0.4)' }}>
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #10b981, #059669)', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="text-lg font-bold text-gray-800 tracking-tight">MyPA</span>
          </NavLink>
          <button
            onClick={onClose}
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
            Personal
          </p>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
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
              <HiOutlineUser className="w-4 h-4 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">Individual</p>
              <p className="text-[10px] text-gray-400">Personal mode</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
