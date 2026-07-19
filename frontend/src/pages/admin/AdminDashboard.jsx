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
import { useSelector } from 'react-redux';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  card:   { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
};

export default function AdminDashboard() {
  usePageTitle('Business Overview');
  const { user } = useSelector((state) => state.auth);
  const [loading,     setLoading]     = useState(true);
  const [overview,    setOverview]    = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [shopComp,    setShopComp]    = useState([]);
  const [salesChart,  setSalesChart]  = useState([]);
  const [chartDays,   setChartDays]   = useState(7);

  // Shop Performance state
  const [shops, setShops] = useState([]);
  const [shopStats, setShopStats] = useState({});
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [perfFrom, setPerfFrom] = useState(getLocalDate());
  const [perfTo, setPerfTo] = useState(getLocalDate());

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadChart(); }, [chartDays]);
  useEffect(() => { if (shops.length > 0) loadShopStats(shops); }, [perfFrom, perfTo]);

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
      // Load shops for performance section
      await loadShops();
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const res = await api.get('/auth/profile');
      const allShops = res.data?.shops || [];
      const ownedShops = allShops.filter(s => s.user_role === 'admin');
      setShops(ownedShops);
      loadShopStats(ownedShops);
    } catch { setShops(user?.shops || []); }
  };

  const loadShopStats = async (shopsList) => {
    const stats = {};
    for (const shop of shopsList) {
      try {
        const res = await api.get('/shop/stats', { params: { shop_id: shop.id, start_date: perfFrom, end_date: perfTo } });
        stats[shop.id] = res.data || {};
      } catch { stats[shop.id] = {}; }
    }
    setShopStats(stats);
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
          label="Staff" value={o.staff} sub={`${o.active_staff || 0} online (Admin)`} color="text-gray-800" />
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

      {/* ═══ Shop Performance ═══ */}
      {shops.length > 0 && (
        <div className="rounded-2xl p-5" style={NEO.raised}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h3 className="text-sm font-bold text-gray-800">Shop Performance</h3>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-500 font-medium">From:</label>
              <input type="date" value={perfFrom} onChange={(e) => setPerfFrom(e.target.value)} className="input-field w-auto text-xs py-1" />
              <label className="text-gray-500 font-medium">To:</label>
              <input type="date" value={perfTo} onChange={(e) => setPerfTo(e.target.value)} className="input-field w-auto text-xs py-1" />
              <button onClick={() => { setPerfFrom(getLocalDate()); setPerfTo(getLocalDate()); }} className="text-[10px] text-primary-600 font-medium hover:text-primary-700">Today</button>
            </div>
          </div>
          <HighchartsReact highcharts={Highcharts} options={{
            chart: { type: 'column', height: Math.max(300, shops.length * 60), backgroundColor: 'transparent' },
            title: { text: null },
            credits: { enabled: false },
            xAxis: {
              categories: shops.map(shop => shop.name),
              labels: { style: { fontSize: '11px', color: '#374151', fontWeight: '500' } },
              lineColor: 'rgba(200,207,216,0.4)',
            },
            yAxis: {
              title: { text: null },
              labels: { style: { fontSize: '10px', color: '#9ca3af' }, formatter() { return fmt(this.value); } },
              gridLineColor: 'rgba(200,207,216,0.3)',
            },
            legend: { align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '11px', fontWeight: '500', color: '#6b7280' } },
            tooltip: {
              shared: true,
              backgroundColor: '#fff',
              borderRadius: 12,
              shadow: true,
              style: { fontSize: '11px' },
              formatter() {
                let tip = `<b>${this.x}</b><br/>`;
                this.points.forEach(p => { tip += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>\u20B9${p.y?.toLocaleString('en-IN') || 0}</b><br/>`; });
                return tip;
              },
            },
            plotOptions: {
              column: {
                borderRadius: 4,
                groupPadding: 0.15,
                pointPadding: 0.05,
                dataLabels: { enabled: true, style: { fontSize: '9px', fontWeight: '600', color: '#374151' }, formatter() { return fmt(this.y); } },
              },
            },
            series: [
              { name: 'Revenue', data: shops.map(shop => parseFloat((shopStats[shop.id] || {}).total_sales) || 0), color: '#10b981' },
              { name: 'Expenses', data: shops.map(shop => parseFloat((shopStats[shop.id] || {}).total_expenses) || 0), color: '#ef4444' },
              { name: 'Purchases', data: shops.map(shop => parseFloat((shopStats[shop.id] || {}).total_purchases) || 0), color: '#f59e0b' },
              { name: 'Net Profit', data: shops.map(shop => {
                const s = shopStats[shop.id] || {};
                return (parseFloat(s.total_sales) || 0) - (parseFloat(s.total_expenses) || 0) - (parseFloat(s.total_purchases) || 0);
              }), color: '#6366f1' },
            ],
          }} />
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
