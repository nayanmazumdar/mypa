import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2" aria-label="MyPA home">
            <img src="/logo.png" alt="MyPA logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">MyPA</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="btn-primary text-sm"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <HiOutlineXMark className="w-6 h-6" />
            ) : (
              <HiOutlineBars3 className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-gray-700 hover:text-primary-600 py-2"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-gray-700 hover:text-primary-600 py-2"
          >
            How it works
          </a>
          <a
            href="#pricing"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-gray-700 hover:text-primary-600 py-2"
          >
            Pricing
          </a>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-secondary text-center text-sm"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="btn-primary text-center text-sm"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
