import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import api from '../api/axios';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products: 0, sales: 0, revenue: 0, customers: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [productsRes, salesRes, customersRes, recentRes, lowStockRes] = await Promise.allSettled([
        api.get('/products', { params: { limit: 1 } }),
        api.get('/sales', { params: { limit: 1 } }),
        api.get('/customers', { params: { limit: 1 } }),
        api.get('/sales', { params: { limit: 5 } }),
        api.get('/inventory/low-stock'),
      ]);

      setStats({
        products: productsRes.status === 'fulfilled' ? productsRes.value?.pagination?.total || 0 : 0,
        sales: salesRes.status === 'fulfilled' ? salesRes.value?.pagination?.total || 0 : 0,
        revenue: salesRes.status === 'fulfilled'
          ? (salesRes.value?.data || []).reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0)
          : 0,
        customers: customersRes.status === 'fulfilled' ? customersRes.value?.pagination?.total || 0 : 0,
      });

      if (recentRes.status === 'fulfilled') {
        setRecentSales(recentRes.value?.data || []);
      }
      if (lowStockRes.status === 'fulfilled') {
        setLowStock(lowStockRes.value?.data || []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {user?.name}. Here is your business overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={stats.products} icon={HiOutlineCube} color="bg-blue-100 text-blue-600" />
        <StatCard title="Total Sales" value={stats.sales} icon={HiOutlineShoppingCart} color="bg-green-100 text-green-600" />
        <StatCard title="Revenue" value={`₹${Number(stats.revenue).toLocaleString('en-IN')}`} icon={HiOutlineCurrencyRupee} color="bg-purple-100 text-purple-600" />
        <StatCard title="Customers" value={stats.customers} icon={HiOutlineUsers} color="bg-orange-100 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent sales to display.</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.invoice_number}</p>
                    <p className="text-xs text-gray-400">{sale.customer_name || 'Walk-in'} • {sale.sale_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₹{sale.net_amount}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{sale.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Low Stock Alerts
            {lowStock.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{lowStock.length}</span>
            )}
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <HiOutlineExclamationTriangle className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{item.quantity} left</p>
                    <p className="text-xs text-gray-400">min: {item.min_stock_level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
