import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineExclamationTriangle,
  HiOutlineScale,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import api from '../api/axios';
import { posApi } from '../api/pos.api';
import { syncDataFromServer } from '../utils/syncService';
import { LoadingSpinner } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState(null);
  const [stats, setStats] = useState({ products: 0, customers: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  // Background sync for offline cache (non-blocking)
  useEffect(() => {
    syncDataFromServer().catch(() => {});
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const isStaff = user?.role === 'staff';
      const summaryParams = isStaff ? { biller_id: 'me' } : {};
      const [summaryRes, productsRes, customersRes, recentRes, lowStockRes] =
        await Promise.allSettled([
          posApi.getTodaySummary(summaryParams),
          api.get('/products', { params: { limit: 1 } }),
          api.get('/customers', { params: { limit: 1 } }),
          api.get('/sales', { params: { limit: 5 } }),
          api.get('/inventory/low-stock'),
        ]);
      if (summaryRes.status === 'fulfilled') setTodaySummary(summaryRes.value.data || summaryRes.value);
      setStats({
        products: productsRes.status === 'fulfilled' ? productsRes.value?.pagination?.total || 0 : 0,
        customers: customersRes.status === 'fulfilled' ? customersRes.value?.pagination?.total || 0 : 0,
      });
      if (recentRes.status === 'fulfilled') setRecentSales(recentRes.value?.data || []);
      if (lowStockRes.status === 'fulfilled') setLowStock(lowStockRes.value?.data || []);
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const todayRevenue = parseFloat(todaySummary?.total_revenue || 0);
  const todayExpenses = parseFloat(todaySummary?.total_expenses || 0);
  const todayPurchases = parseFloat(todaySummary?.total_purchases || 0);
  const todayNet = todayRevenue - todayExpenses - todayPurchases;
  const todayTxCount = todaySummary?.total_transactions || 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">

      {/* ─── Welcome Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here's how your shop is doing today.</p>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold text-white self-start sm:self-auto transition-all"
          style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff' }}
        >
          <HiOutlineScale className="w-5 h-5" /> Open POS
        </button>
      </div>

      {/* ─── Today's Performance ─────────────────────────────── */}
      <div
        className="rounded-3xl p-6 sm:p-8"
        style={{ background: '#e8edf5', boxShadow: '8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff' }}
      >
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-6">Today's Performance</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineArrowTrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 tabular-nums">₹{todayRevenue.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 font-medium uppercase tracking-wide">Revenue ({todayTxCount} txns)</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineShoppingCart className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 tabular-nums">₹{parseFloat(todaySummary?.total_purchases || 0).toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 font-medium uppercase tracking-wide">Purchases</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineArrowTrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 tabular-nums">₹{todayExpenses.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 font-medium uppercase tracking-wide">Expenses</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineBanknotes className={`w-5 h-5 mx-auto mb-2 ${todayNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${todayNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₹{todayNet.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 font-medium uppercase tracking-wide">Net Cash Flow</p>
          </div>
        </div>
      </div>

      {/* ─── Quick Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <NeoStat label="Products" value={stats.products} icon={HiOutlineCube} onClick={() => navigate('/products')} />
        <NeoStat label="Customers" value={stats.customers} icon={HiOutlineUsers} onClick={() => navigate('/customers')} />
        <NeoStat label="Low Stock" value={lowStock.length} icon={HiOutlineExclamationTriangle} alert={lowStock.length > 0} onClick={() => navigate('/inventory')} />
        <NeoStat label="Today's Sales" value={todayTxCount} icon={HiOutlineShoppingCart} onClick={() => navigate('/sales')} />
      </div>

      {/* ─── Recent Sales + Alerts ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Sales */}
        <div className="lg:col-span-3 rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
            <h3 className="text-sm font-bold text-gray-800">Recent Sales</h3>
            <button onClick={() => navigate('/sales')} className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5">
              View All <HiOutlineChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
                <HiOutlineShoppingCart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No sales today yet</p>
              <button onClick={() => navigate('/pos')} className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700">Start selling →</button>
            </div>
          ) : (
            <div>
              {recentSales.map((sale, idx) => (
                <div key={sale.id} className="px-6 py-4 flex items-center justify-between" style={idx < recentSales.length - 1 ? { borderBottom: '1px solid rgba(200,207,216,0.2)' } : {}}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>
                      <HiOutlineCurrencyRupee className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{sale.customer_name || 'Walk-in Customer'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{sale.invoice_number} · {sale.sale_date}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-bold text-gray-800">₹{parseFloat(sale.net_amount).toLocaleString('en-IN')}</p>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg mt-1 ${sale.payment_status === 'paid' ? 'text-emerald-700' : sale.payment_status === 'partial' ? 'text-amber-700' : 'text-red-600'}`}
                      style={{ background: '#e8edf5', boxShadow: 'inset 1px 1px 2px #c8cfd8, inset -1px -1px 2px #ffffff' }}
                    >{sale.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              Alerts
              {lowStock.length > 0 && (
                <span className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(145deg, #ef4444, #dc2626)' }}>{lowStock.length}</span>
              )}
            </h3>
            {lowStock.length > 0 && (
              <button onClick={() => navigate('/inventory')} className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5">
                Manage <HiOutlineChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {lowStock.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
                <HiOutlineCube className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">Stock looks good!</p>
              <p className="text-xs text-gray-400 mt-1">All items are above minimum levels.</p>
            </div>
          ) : (
            <div>
              {lowStock.slice(0, 6).map((item, idx) => (
                <div key={item.id} className="px-6 py-3.5 flex items-center justify-between" style={idx < Math.min(lowStock.length, 6) - 1 ? { borderBottom: '1px solid rgba(200,207,216,0.2)' } : {}}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.quantity <= 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-[11px] text-gray-400">{item.sku || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-sm font-bold ${item.quantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.quantity}</p>
                    <p className="text-[10px] text-gray-400">min {item.min_stock_level}</p>
                  </div>
                </div>
              ))}
              {lowStock.length > 6 && (
                <button onClick={() => navigate('/inventory')} className="w-full px-6 py-3.5 text-xs font-semibold text-primary-600 text-center transition-colors" style={{ borderTop: '1px solid rgba(200,207,216,0.2)' }}>
                  +{lowStock.length - 6} more items →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Neo Stat Card ────────────────────────────────────────────── */
function NeoStat({ label, value, icon: Icon, alert, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 text-left transition-all group active:scale-[0.98]"
      style={{ background: '#e8edf5', boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}
        >
          <Icon className={`w-5 h-5 ${alert ? 'text-red-500' : 'text-gray-400 group-hover:text-primary-600'} transition-colors`} />
        </div>
        <HiOutlineChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
      <p className={`text-3xl font-bold ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{label}</p>
    </button>
  );
}
