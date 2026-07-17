import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineArchiveBox,
  HiOutlineUsers,
  HiOutlineBuildingStorefront,
  HiOutlineCog6Tooth,
  HiOutlineXMark,
  HiOutlineScale,
  HiOutlineBanknotes,
  HiOutlineGift,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import { canAccessRoute } from '../../utils/permissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HiOutlineHome, section: 'main' },
  { name: 'POS / Billing', href: '/pos', icon: HiOutlineScale, section: 'main' },
  { name: 'Products', href: '/products', icon: HiOutlineCube, section: 'catalog' },
  { name: 'Offers', href: '/offers', icon: HiOutlineGift, section: 'catalog' },
  { name: 'Sales', href: '/sales', icon: HiOutlineShoppingCart, section: 'transactions' },
  { name: 'Purchases', href: '/purchases', icon: HiOutlineTruck, section: 'transactions' },
  { name: 'Inventory', href: '/inventory', icon: HiOutlineArchiveBox, section: 'transactions' },
  { name: 'Customers', href: '/customers', icon: HiOutlineUsers, section: 'people' },
  { name: 'Suppliers', href: '/suppliers', icon: HiOutlineBuildingStorefront, section: 'people' },
  { name: 'Accounts', href: '/accounts', icon: HiOutlineBanknotes, section: 'finance' },
  { name: 'Reports', href: '/reports', icon: HiOutlineChartBar, section: 'finance' },
  { name: 'Settings', href: '/settings', icon: HiOutlineCog6Tooth, section: 'system' },
];

const sectionLabels = {
  main: null,
  catalog: 'Catalog',
  transactions: 'Transactions',
  people: 'People',
  finance: 'Finance',
  system: null,
};

export default function Sidebar({ open, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'staff';
  const filteredNav = navigation.filter((item) => canAccessRoute(role, item.href));

  // Group navigation by section
  const sections = [];
  let currentSection = null;
  filteredNav.forEach((item) => {
    if (item.section !== currentSection) {
      currentSection = item.section;
      sections.push({ label: sectionLabels[item.section], items: [] });
    }
    sections[sections.length - 1].items.push(item);
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-out md:relative md:translate-x-0 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#e8edf5', boxShadow: '6px 0 12px #c8cfd8' }}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between h-16 px-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,207,216,0.4)' }}>
          <a href="/" className="flex items-center gap-2.5 cursor-pointer">
            <img
              src="/logo.png"
              alt="MyPA Logo"
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
              style={{ boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            />
            <span className="text-lg font-bold text-gray-800 tracking-tight">MyPA</span>
          </a>
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
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={section.label ? 'mt-5 first:mt-0' : ''}>
              {section.label && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
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
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(200,207,216,0.4)' }}>
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>
              <span className="text-primary-700 text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
