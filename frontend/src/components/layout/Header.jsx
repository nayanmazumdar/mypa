import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineArrowRightOnRectangle, HiOutlineArrowsRightLeft, HiOutlineArrowPath, HiOutlineSignal, HiOutlineSignalSlash } from 'react-icons/hi2';
import { logout, switchShop } from '../../store/authSlice';
import api from '../../api/axios';
import { useNetwork } from '../../hooks/useNetwork';

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetwork();

  // Live date and time
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleLogout = async () => {
    // Record logout time in the activity log before clearing state
    const logId = user?.log_id;
    if (logId) {
      try { await api.post('/login-logs/logout', { log_id: logId }); } catch (_) {}
    }
    dispatch(logout());
    navigate('/login');
  };

  const handleSwitchShop = async () => {
    // Record logout when switching shop too
    const logId = user?.log_id;
    if (logId) {
      try { await api.post('/login-logs/logout', { log_id: logId }); } catch (_) {}
    }
    dispatch(switchShop());
    navigate('/admin/shops');
  };

  // Derive open/closed status from the active shop in the user.shops list
  const activeShop = user?.shops?.find((s) => s.id === user?.shop_id);
  const isOpen = activeShop ? !!activeShop.is_open : null;

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
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-800">{user?.shop_name || 'My Shop'}</h1>
            {isOpen !== null && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOpen ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-orange-400'}`} />
                {isOpen ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 hidden sm:block">Welcome, {user?.name}</p>
          <p className="text-[10px] text-primary-600 font-medium hidden sm:block">{dateStr} · {timeStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Online/Offline Indicator + Sync */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={triggerSync}
            disabled={!isOnline || isSyncing}
            className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: '#e8edf5', boxShadow: isSyncing ? 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' : '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            title={isOnline ? (pendingCount > 0 ? `${pendingCount} pending sync` : 'All synced') : 'Offline'}
          >
            {isOnline ? (
              <HiOutlineSignal className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <HiOutlineSignalSlash className="w-3.5 h-3.5 text-red-500" />
            )}
            {isSyncing && <HiOutlineArrowPath className="w-3 h-3 text-blue-500 animate-spin" />}
            {pendingCount > 0 && !isSyncing && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
          <span className={`text-[10px] font-medium hidden sm:inline ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
            {isOnline ? (isSyncing ? 'Syncing...' : 'Online') : 'Offline'}
          </span>
        </div>

        {/* Switch Shop — always visible for owner (admin), otherwise only when multiple shops */}
        {(user?.role === 'admin' || user?.shops?.length > 1) && (
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
