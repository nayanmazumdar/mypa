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
  { name: 'Dashboard',   href: '/individual',          icon: HiOutlineHome,                  end: true },
  { name: 'My Income',   href: '/individual/income',   icon: HiOutlineArrowTrendingUp },
  { name: 'My Expenses', href: '/individual/expenses', icon: HiOutlineArrowTrendingDown },
  { name: 'My Tasks',    href: '/individual/tasks',    icon: HiOutlineClipboardDocumentList },
  { name: 'My Notes',    href: '/individual/notes',    icon: HiOutlinePencilSquare },
  { name: 'Reports',     href: '/individual/report',   icon: HiOutlineChartBarSquare },
  { name: 'Settings',    href: '/individual/settings', icon: HiOutlineCog6Tooth },
];

export default function IndividualSidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <NavLink to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="MyPA" className="h-10 w-auto" />
            <span className="text-sm font-semibold text-indigo-700 tracking-wide">Individuals</span>
          </NavLink>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-gray-500 hover:text-gray-700"
            aria-label="Close sidebar"
          >
            <HiOutlineXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Role badge at bottom */}
        <div className="px-4 py-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            <HiOutlineUser className="w-3.5 h-3.5" />
            Individual
          </span>
        </div>
      </aside>
    </>
  );
}
