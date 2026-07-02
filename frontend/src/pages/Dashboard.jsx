import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
} from 'react-icons/hi2';
import api from '../api/axios';

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
  const [stats, setStats] = useState({
    products: 0,
    sales: 0,
    revenue: 0,
    customers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [products, sales, customers] = await Promise.allSettled([
          api.get('/products', { params: { limit: 1 } }),
          api.get('/sales', { params: { limit: 1 } }),
          api.get('/customers', { params: { limit: 1 } }),
        ]);

        setStats({
          products: products.status === 'fulfilled' ? products.value.pagination?.total || 0 : 0,
          sales: sales.status === 'fulfilled' ? sales.value.pagination?.total || 0 : 0,
          revenue: 0,
          customers: customers.status === 'fulfilled' ? customers.value.pagination?.total || 0 : 0,
        });
      } catch {
        // Stats will remain at 0
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {user?.name}. Here's your business overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.products}
          icon={HiOutlineCube}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Sales"
          value={stats.sales}
          icon={HiOutlineShoppingCart}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Revenue"
          value={`₹${stats.revenue.toLocaleString()}`}
          icon={HiOutlineCurrencyRupee}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Customers"
          value={stats.customers}
          icon={HiOutlineUsers}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sales</h3>
          <p className="text-gray-500 text-sm">No recent sales to display.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
          <p className="text-gray-500 text-sm">No low stock alerts.</p>
        </div>
      </div>
    </div>
  );
}
