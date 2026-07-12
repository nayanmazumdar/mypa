import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function IndividualDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [loading,    setLoading]    = useState(true);
  const [summary,    setSummary]    = useState(null);
  const [notesCount, setNotesCount] = useState(null);

  const today        = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const firstOfYear  = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo,   setDateTo]   = useState(today);
  const [activePreset, setActivePreset] = useState('This Month');

  const PRESETS = [
    { label: 'Today',      from: today,        to: today },
    { label: 'This Month', from: firstOfMonth, to: today },
    { label: 'This Year',  from: firstOfYear,  to: today },
  ];

  const fetchSummary = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const [dashRes, notesRes] = await Promise.all([
        individualApi.getDashboard({ from, to }),
        api.get('/notes', { params: { from, to } }),
      ]);
      setSummary(dashRes.data);
      const notes = notesRes.data || [];
      setNotesCount({ total: notes.length, pinned: notes.filter(n => n.pinned).length });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(dateFrom, dateTo); }, []);

  // Auto-reload when custom dates change
  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    fetchSummary(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  if (loading) return <LoadingSpinner />;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const net = summary?.net_balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good day, {user?.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Showing data from <span className="font-medium text-gray-700">{new Date(dateFrom+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span> to <span className="font-medium text-gray-700">{new Date(dateTo+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-wide">
            Manage Today. Stay Secure Tomorrow.
          </span>
        </div>

        {/* Date range picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets */}
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => {
                setActivePreset(p.label);
                setDateFrom(p.from);
                setDateTo(p.to);
                fetchSummary(p.from, p.to);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activePreset === p.label
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
          {/* Custom range */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm text-xs">
            <span className="text-gray-400">From</span>
            <input type="date" value={dateFrom} max={dateTo}
              onChange={e => { setActivePreset(''); setDateFrom(e.target.value); }}
              className="text-gray-700 outline-none bg-transparent"
            />
            <span className="text-gray-400 mx-0.5">—</span>
            <span className="text-gray-400">To</span>
            <input type="date" value={dateTo} min={dateFrom} max={today}
              onChange={e => { setActivePreset(''); setDateTo(e.target.value); }}
              className="text-gray-700 outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Income"
          value={fmt(summary?.total_income)}
          icon={HiOutlineArrowTrendingUp}
          color="bg-green-100 text-green-600"
          sub="This month"
        />
        <StatCard
          title="Total Expenses"
          value={fmt(summary?.total_expense)}
          icon={HiOutlineArrowTrendingDown}
          color="bg-red-100 text-red-600"
          sub="This month"
        />
        <StatCard
          title="Net Balance"
          value={fmt(net)}
          icon={HiOutlineBanknotes}
          color={net >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}
          sub={net >= 0 ? 'Surplus' : 'Deficit'}
        />
        <StatCard
          title="Tasks"
          value={`${summary?.tasks?.completed ?? 0} / ${summary?.tasks?.total ?? 0}`}
          icon={HiOutlineClipboardDocumentList}
          color="bg-purple-100 text-purple-600"
          sub={`${summary?.tasks?.due_today ?? 0} due today`}
        />
        <Link to="/individual/notes" className="block">
          <StatCard
            title="My Notes"
            value={notesCount?.total ?? '—'}
            icon={HiOutlinePencilSquare}
            color="bg-amber-100 text-amber-600"
            sub={notesCount?.pinned ? `${notesCount.pinned} pinned` : 'Tap to view'}
          />
        </Link>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HiOutlineBanknotes className="w-5 h-5 text-indigo-500" />
            Financial Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Income</span>
              <span className="text-sm font-semibold text-green-600">{fmt(summary?.total_income)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Expenses</span>
              <span className="text-sm font-semibold text-red-600">{fmt(summary?.total_expense)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-800">Net Balance</span>
              <span className={`text-sm font-bold ${net >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>
                {fmt(net)}
              </span>
            </div>
          </div>
          <Link
            to="/individual/report"
            className="mt-4 block text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View Full Report →
          </Link>
        </div>

        {/* Task summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <HiOutlineClipboardDocumentList className="w-5 h-5 text-purple-500" />
              Task Overview
            </h3>
            <Link
              to="/individual/tasks"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <HiOutlineClock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">
                {(summary?.tasks?.total ?? 0) - (summary?.tasks?.completed ?? 0)}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <HiOutlineCheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{summary?.tasks?.completed ?? 0}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <HiOutlineClock className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{summary?.tasks?.due_today ?? 0}</p>
              <p className="text-xs text-gray-500">Due Today</p>
            </div>
          </div>

          <Link
            to="/individual/tasks"
            className="mt-4 block w-full text-center py-2 rounded-lg border border-indigo-200 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Manage Tasks
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-amber-500 text-lg leading-none mt-0.5">ℹ️</span>
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Disclaimer —</span> The Income, Expenses, Tasks, and Notes tracked here are for <span className="font-semibold">personal management only</span> and have no relation to actual business income, expenses, or any other financial records in the system.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/individual/income?add=1', label: 'Add Income', color: 'bg-green-600 hover:bg-green-700' },
          { to: '/individual/expenses?add=1', label: 'Add Expense', color: 'bg-red-500 hover:bg-red-600' },
          { to: '/individual/tasks?add=1', label: 'New Task', color: 'bg-purple-600 hover:bg-purple-700' },
          { to: '/individual/report', label: 'View Report', color: 'bg-indigo-600 hover:bg-indigo-700' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`${item.color} text-white text-sm font-medium py-2.5 rounded-lg text-center transition-colors`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
