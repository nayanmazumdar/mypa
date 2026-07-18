import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import {
  HiOutlineBuildingStorefront, HiOutlineUserGroup, HiOutlineCube,
  HiOutlineCurrencyRupee, HiOutlineExclamationTriangle,
  HiOutlineArrowTrendingUp, HiOutlineUsers, HiOutlineChartBar,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  card:   { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
};

export default function AdminDashboard() {
  usePageTitle('Business Overview');
  const [loading,     setLoading]     = useState(true);
  const [overview,    setOverview]    = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [shopComp,    setShopComp]    = useState([]);
  const [salesChart,  setSalesChart]  = useState([]);
  const [chartDays,   setChartDays]   = useState(7);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadChart(); }, [chartDays]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ovRes, tpRes, scRes, chartRes] = await Promise.allSettled([
        api.get('/admin/dashboard/overview'),
        api.get('/admin/dashboard/top-products'),
        api.get('/admin/dashboard/shop-comparison'),
        api.get(`/admin/dashboard/sales-chart?days=${chartDays}`),
      ]);
      if (ovRes.status === 'fulfilled')    setOverview(ovRes.value.data || ovRes.value);
      if (tpRes.status === 'fulfilled')    setTopProducts(tpRes.value.data || tpRes.value || []);
      if (scRes.status === 'fulfilled')    setShopComp(scRes.value.data || scRes.value || []);
      if (chartRes.status === 'fulfilled') setSalesChart(chartRes.value.data || chartRes.value || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadChart = async () => {
    try {
      const res = await api.get(`/admin/dashboard/sales-chart?days=${chartDays}`);
      setSalesChart(res.data || res || []);
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingSpinner />;

  const o = overview || {};
  const fmt = (n) => {
    if (n == null) return '₹0';
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
  };

  // ── Highcharts: Revenue Trend ──────────────────────────────
  const revenueChartOptions = {
    chart: { type: 'areaspline', height: 260, backgroundColor: 'transparent' },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: salesChart.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }),
      labels: { style: { fontSize: '10px', color: '#9ca3af' } },
      lineColor: 'rgba(200,207,216,0.4)',
    },
    yAxis: {
      title: { text: null },
      labels: { style: { fontSize: '10px', color: '#9ca3af' }, formatter() { return fmt(this.value); } },
      gridLineColor: 'rgba(200,207,216,0.3)',
    },
    legend: { enabled: false },
    tooltip: {
      shared: true,
      backgroundColor: '#fff',
      borderRadius: 12,
      shadow: true,
      style: { fontSize: '11px' },
      formatter() {
        return `<b>${this.x}</b><br/>Revenue: <b>₹${this.points[0]?.y?.toLocaleString('en-IN') || 0}</b><br/>Sales: <b>${this.points[1]?.y || 0}</b>`;
      },
    },
    plotOptions: {
      areaspline: { fillOpacity: 0.15, marker: { radius: 4, fillColor: '#6366f1' }, lineWidth: 2.5 },
      spline: { marker: { radius: 3 }, lineWidth: 2 },
    },
    series: [
      { name: 'Revenue', data: salesChart.map(d => parseFloat(d.revenue) || 0), color: '#6366f1' },
      { name: 'Transactions', type: 'spline', data: salesChart.map(d => parseInt(d.transactions) || 0), color: '#10b981', yAxis: 0 },
    ],
  };

  // ── Highcharts: Shop Comparison Pie ────────────────────────
  const shopPieOptions = shopComp.length > 1 ? {
    chart: { type: 'pie', height: 240, backgroundColor: 'transparent' },
    title: { text: null },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)' },
    plotOptions: {
      pie: {
        innerSize: '55%',
        borderWidth: 0,
        dataLabels: { enabled: true, format: '{point.name}', distance: 15, style: { fontSize: '10px', fontWeight: '500' } },
      },
    },
    series: [{ name: 'Revenue', colorByPoint: true, data: shopComp.map(s => ({ name: s.name, y: parseFloat(s.month_revenue) || 0 })) }],
  } : null;

  // ── Highcharts: Top Products Bar ───────────────────────────
  const topProductsChartOptions = topProducts.length > 0 ? {
    chart: { type: 'bar', height: Math.max(200, topProducts.length * 35), backgroundColor: 'transparent' },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: topProducts.map(p => p.name?.slice(0, 20)),
      labels: { style: { fontSize: '10px', color: '#6b7280' } },
    },
    yAxis: { title: { text: null }, labels: { style: { fontSize: '10px', color: '#9ca3af' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: 'Sold: <b>{point.y}</b> units' },
    plotOptions: { bar: { borderRadius: 4, color: '#6366f1' } },
    series: [{ name: 'Units Sold', data: topProducts.map(p => parseInt(p.total_sold) || 0) }],
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineChartBar className="w-6 h-6 text-primary-600" />
          Business Overview
        </h1>
        <p className="text-sm text-gray-500 mt-1">Cross-shop performance at a glance</p>
      </div>

      {/* KPI Cards - Row 1: Revenue */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<HiOutlineCurrencyRupee className="w-5 h-5 text-green-500" />}
          label="Today Revenue" value={fmt(o.today_revenue)} sub={`${o.today_sales || 0} sales`} color="text-green-700" />
        <KpiCard icon={<HiOutlineArrowTrendingUp className="w-5 h-5 text-blue-500" />}
          label="This Month" value={fmt(o.month_revenue)} sub={`${o.month_sales || 0} sales`} color="text-blue-700" />
        <KpiCard icon={<HiOutlineCurrencyRupee className="w-5 h-5 text-red-400" />}
          label="Today Expenses" value={fmt(o.today_expenses)} color="text-red-600" />
        <KpiCard icon={<HiOutlineCurrencyRupee className="w-5 h-5 text-emerald-500" />}
          label="Today Profit" value={fmt(o.today_profit)} color={o.today_profit >= 0 ? 'text-emerald-700' : 'text-red-600'} />
      </div>

      {/* KPI Cards - Row 2: Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard icon={<HiOutlineBuildingStorefront className="w-5 h-5 text-purple-500" />}
          label="Shops" value={o.shops} color="text-gray-800" />
        <KpiCard icon={<HiOutlineUserGroup className="w-5 h-5 text-blue-500" />}
          label="Staff" value={o.staff} sub={`${o.active_staff || 0} online`} color="text-gray-800" />
        <KpiCard icon={<HiOutlineCube className="w-5 h-5 text-indigo-500" />}
          label="Products" value={o.products} color="text-gray-800" />
        <KpiCard icon={<HiOutlineUsers className="w-5 h-5 text-teal-500" />}
          label="Customers" value={o.customers} color="text-gray-800" />
        <KpiCard icon={<HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500" />}
          label="Stock Alerts" value={(o.low_stock || 0) + (o.out_of_stock || 0)}
          sub={`${o.out_of_stock || 0} out of stock`} color="text-amber-700" />
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-2xl p-5" style={NEO.raised}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-800">Revenue Trend</h3>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setChartDays(d)}
                className={`px-3 py-1 text-[10px] font-semibold transition-colors ${chartDays === d ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {d}D
              </button>
            ))}
          </div>
        </div>
        {salesChart.length > 0 ? (
          <HighchartsReact highcharts={Highcharts} options={revenueChartOptions} />
        ) : (
          <p className="text-xs text-gray-400 py-12 text-center">No sales data for this period</p>
        )}
      </div>

      {/* Two-column: Shop Pie + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shop Revenue Share */}
        {shopPieOptions && (
          <div className="rounded-2xl p-5" style={NEO.raised}>
            <h3 className="text-sm font-bold text-gray-800 mb-2">Shop Revenue Share (This Month)</h3>
            <HighchartsReact highcharts={Highcharts} options={shopPieOptions} />
          </div>
        )}

        {/* Top Products */}
        {topProductsChartOptions && (
          <div className="rounded-2xl p-5" style={NEO.raised}>
            <h3 className="text-sm font-bold text-gray-800 mb-2">Top Products (30 Days)</h3>
            <HighchartsReact highcharts={Highcharts} options={topProductsChartOptions} />
          </div>
        )}
      </div>

      {/* Shop Comparison Table */}
      {shopComp.length > 1 && (
        <div className="rounded-2xl p-5" style={NEO.raised}>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Shop Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-[10px] font-semibold text-gray-400 uppercase">Shop</th>
                  <th className="text-right pb-2 text-[10px] font-semibold text-gray-400 uppercase">Revenue</th>
                  <th className="text-right pb-2 text-[10px] font-semibold text-gray-400 uppercase">Transactions</th>
                  <th className="text-right pb-2 text-[10px] font-semibold text-gray-400 uppercase">Products</th>
                  <th className="text-right pb-2 text-[10px] font-semibold text-gray-400 uppercase">Staff</th>
                </tr>
              </thead>
              <tbody>
                {shopComp.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100/50">
                    <td className="py-2.5 font-medium text-gray-800">{s.name}</td>
                    <td className="py-2.5 text-right font-semibold text-green-700">{fmt(parseFloat(s.month_revenue))}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.month_transactions}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.product_count}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.staff_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color = 'text-gray-800' }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{
      background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff',
    }}>
      <div className="flex items-center justify-between">
        {icon}
        <p className={`text-lg font-bold ${color}`}>{value ?? '—'}</p>
      </div>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
    </div>
  );
}
