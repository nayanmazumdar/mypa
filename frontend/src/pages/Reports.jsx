import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineChartBar, HiOutlineCalendar, HiOutlineTrophy, HiOutlineCurrencyRupee } from 'react-icons/hi2';
import api from '../api/axios';
import { PageHeader, FilterTabs } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Reports() {
  usePageTitle('Reports');
  const [activeTab, setActiveTab] = useState('daily');
  const [dailySales, setDailySales] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [profitRange, setProfitRange] = useState({ start_date: getFirstOfMonth(), end_date: new Date().toISOString().split('T')[0] });

  function getFirstOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  useEffect(() => { loadDailySales(); }, [dateFilter]);
  useEffect(() => { loadMonthlySales(); }, [monthFilter]);
  useEffect(() => { loadTopProducts(); loadProfitReport(); }, [profitRange]);

  const loadDailySales = async () => {
    try {
      const res = await api.get('/reports/daily-sales', { params: { date: dateFilter } });
      setDailySales(res.data);
    } catch { toast.error('Failed to load daily sales'); }
  };

  const loadMonthlySales = async () => {
    try {
      const res = await api.get('/reports/monthly-sales', { params: monthFilter });
      setMonthlySales(res.data || []);
    } catch { toast.error('Failed to load monthly sales'); }
  };

  const loadTopProducts = async () => {
    try {
      const res = await api.get('/reports/top-products', { params: { start_date: profitRange.start_date, end_date: profitRange.end_date, limit: 10 } });
      setTopProducts(res.data || []);
    } catch { /* silent */ }
  };

  const loadProfitReport = async () => {
    try {
      const res = await api.get('/reports/profit', { params: profitRange });
      setProfitData(res.data);
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Sales analytics and business insights" />

      {/* Tabs */}
      <FilterTabs value={activeTab} onChange={setActiveTab} options={[
        { value: 'daily', label: 'Daily Sales' },
        { value: 'monthly', label: 'Monthly Sales' },
        { value: 'products', label: 'Top Products' },
        { value: 'profit', label: 'Profit' },
      ]} />

      {/* Daily Sales */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input" />
          </div>
          {dailySales && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{dailySales.total_sales || 0}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{parseFloat(dailySales.total_revenue || 0).toFixed(0)}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Discounts Given</p>
                <p className="text-2xl font-bold text-orange-600">₹{parseFloat(dailySales.total_discount || 0).toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Sales */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <input type="number" value={monthFilter.year} onChange={(e) => setMonthFilter({ ...monthFilter, year: parseInt(e.target.value) })} className="input w-24" />
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <select value={monthFilter.month} onChange={(e) => setMonthFilter({ ...monthFilter, month: parseInt(e.target.value) })} className="input">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(200,207,216,0.2)" }}>
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sales Count</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="">
                {monthlySales.length === 0 ? (
                  <tr><td colSpan="3" className="px-5 py-14 text-center text-gray-400 text-sm">No sales data for this period.</td></tr>
                ) : monthlySales.map((day) => (
                  <tr key={day.date} className="transition-colors" style={{ }}>
                    <td className="px-5 py-4 font-medium">{day.date}</td>
                    <td className="px-5 py-4 text-right">{day.total_sales}</td>
                    <td className="px-5 py-4 text-right font-medium text-green-600">₹{parseFloat(day.total_revenue).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
              {monthlySales.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-5 py-4 font-semibold">Total</td>
                    <td className="px-5 py-4 text-right font-semibold">{monthlySales.reduce((s, d) => s + d.total_sales, 0)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-green-600">₹{monthlySales.reduce((s, d) => s + parseFloat(d.total_revenue), 0).toFixed(0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Top Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input type="date" value={profitRange.start_date} onChange={(e) => setProfitRange({ ...profitRange, start_date: e.target.value })} className="input" />
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input type="date" value={profitRange.end_date} onChange={(e) => setProfitRange({ ...profitRange, end_date: e.target.value })} className="input" />
          </div>
          <div className="rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(200,207,216,0.2)" }}>
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">#</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Qty Sold</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="">
                {topProducts.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-14 text-center text-gray-400 text-sm">No sales data for this period.</td></tr>
                ) : topProducts.map((p, i) => (
                  <tr key={p.id} className="transition-colors" style={{ }}>
                    <td className="px-5 py-4 text-gray-500">{i + 1}</td>
                    <td className="px-5 py-4 font-medium">{p.name}</td>
                    <td className="px-5 py-4 text-gray-500">{p.sku || '-'}</td>
                    <td className="px-5 py-4 text-right">{p.total_quantity}</td>
                    <td className="px-5 py-4 text-right font-medium text-green-600">₹{parseFloat(p.total_revenue).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit */}
      {activeTab === 'profit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input type="date" value={profitRange.start_date} onChange={(e) => setProfitRange({ ...profitRange, start_date: e.target.value })} className="input" />
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input type="date" value={profitRange.end_date} onChange={(e) => setProfitRange({ ...profitRange, end_date: e.target.value })} className="input" />
          </div>
          {profitData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">₹{parseFloat(profitData.total_sales || 0).toFixed(0)}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Total Cost (COGS)</p>
                <p className="text-2xl font-bold text-red-600">₹{parseFloat(profitData.total_cost || 0).toFixed(0)}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
                <p className={`text-2xl font-bold ${parseFloat(profitData.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{parseFloat(profitData.profit || 0).toFixed(0)}
                </p>
              </div>
            </div>
          )}
          {profitData && parseFloat(profitData.total_sales || 0) > 0 && (
            <div className="card">
              <p className="text-sm text-gray-500 mb-2">Profit Margin</p>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${parseFloat(profitData.profit || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, (parseFloat(profitData.profit || 0) / parseFloat(profitData.total_sales || 1)) * 100))}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {((parseFloat(profitData.profit || 0) / parseFloat(profitData.total_sales || 1)) * 100).toFixed(1)}% margin
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
