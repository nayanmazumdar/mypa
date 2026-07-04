import { NavLink } from 'react-router-dom';
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
} from 'react-icons/hi2';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HiOutlineHome },
  { name: 'POS / Billing', href: '/pos', icon: HiOutlineScale },
  { name: 'Products', href: '/products', icon: HiOutlineCube },
  { name: 'Offers', href: '/offers', icon: HiOutlineGift },
  { name: 'Sales', href: '/sales', icon: HiOutlineShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: HiOutlineTruck },
  { name: 'Inventory', href: '/inventory', icon: HiOutlineArchiveBox },
  { name: 'Customers', href: '/customers', icon: HiOutlineUsers },
  { name: 'Suppliers', href: '/suppliers', icon: HiOutlineBuildingStorefront },
  { name: 'Accounts', href: '/accounts', icon: HiOutlineBanknotes },
  { name: 'Settings', href: '/settings', icon: HiOutlineCog6Tooth },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-semibold text-gray-900">Shopkeeper</span>
          </div>
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
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
