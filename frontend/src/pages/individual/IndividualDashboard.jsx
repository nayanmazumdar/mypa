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
  HiOutlineChevronRight,
  HiOutlineChartBarSquare,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineShoppingCart,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const NeoStat = ({ title, value, icon: Icon, color, sub, onClick }) => (
  <button
    onClick={onClick}
    className="w-full h-full rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:scale-[1.02]"
    style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
    >
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </button>
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
  const [showAmounts, setShowAmounts] = useState(false);

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

  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    fetchSummary(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  if (loading) return <LoadingSpinner />;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const net = summary?.net_balance ?? 0;
  const mask = (val) => showAmounts ? val : '•••••';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-7">

      {/* ─── Welcome Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-sm text-gray-500 mt-1">
              Showing data from{' '}
              <span className="font-medium text-gray-700">
                {new Date(dateFrom+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
              </span>{' '}to{' '}
              <span className="font-medium text-gray-700">
                {new Date(dateTo+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
              </span>
            </p>
          </div>
        </div>

        {/* Date presets + Toggle amount visibility */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setActivePreset(p.label); setDateFrom(p.from); setDateTo(p.to); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activePreset === p.label
                  ? 'text-primary-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              style={activePreset === p.label
                ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }
                : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }
              }
            >
              {p.label}
            </button>
          ))}
          {/* Custom date inputs */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
            style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}
          >
            <input type="date" value={dateFrom} max={dateTo}
              onChange={e => { setActivePreset(''); setDateFrom(e.target.value); }}
              className="text-gray-700 outline-none bg-transparent text-xs"
            />
            <span className="text-gray-400">—</span>
            <input type="date" value={dateTo} min={dateFrom} max={today}
              onChange={e => { setActivePreset(''); setDateTo(e.target.value); }}
              className="text-gray-700 outline-none bg-transparent text-xs"
            />
          </div>
          {/* Toggle amount visibility */}
          <button
            onClick={() => setShowAmounts(v => !v)}
            className="px-3.5 py-2 rounded-xl text-gray-400 hover:text-primary-600 transition-all flex-shrink-0"
            style={{ background: '#e8edf5', boxShadow: showAmounts ? 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' : '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            aria-label={showAmounts ? 'Hide amounts' : 'Show amounts'}
            title={showAmounts ? 'Hide amounts' : 'Show amounts'}
          >
            {showAmounts
              ? <HiOutlineEyeSlash className="w-5 h-5" />
              : <HiOutlineEye className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* ─── Summary Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <NeoStat
          title="Total Income"
          value={mask(fmt(summary?.total_income))}
          icon={HiOutlineArrowTrendingUp}
          color="text-emerald-500"
          sub="This period"
        />
        <NeoStat
          title="Total Expenses"
          value={mask(fmt(summary?.total_expense))}
          icon={HiOutlineArrowTrendingDown}
          color="text-red-400"
          sub="This period"
        />
        <NeoStat
          title="Net Balance"
          value={mask(fmt(net))}
          icon={HiOutlineBanknotes}
          color={net >= 0 ? 'text-emerald-600' : 'text-orange-500'}
          sub={net >= 0 ? 'Surplus' : 'Deficit'}
        />
        <NeoStat
          title="Tasks"
          value={`${summary?.tasks?.completed ?? 0} / ${summary?.tasks?.total ?? 0}`}
          icon={HiOutlineClipboardDocumentList}
          color="text-purple-500"
          sub={`${summary?.tasks?.due_today ?? 0} due today`}
        />
        <Link to="/individual/notes" className="block h-full">
          <NeoStat
            title="My Notes"
            value={notesCount?.total ?? '—'}
            icon={HiOutlinePencilSquare}
            color="text-amber-500"
            sub={notesCount?.pinned ? `${notesCount.pinned} pinned` : 'Tap to view'}
          />
        </Link>
      </div>

      {/* ─── Financial Health + Tasks ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Financial Health */}
        <div
          className="rounded-3xl p-6"
          style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
        >
          <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <HiOutlineBanknotes className="w-5 h-5 text-primary-500" />
              Financial Health
            </span>
            {net !== 0 && (
              <span className="relative group">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase cursor-default select-none ${
                    net >= 0
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-orange-700 bg-orange-100'
                  }`}
                >
                  {net >= 0 ? 'Visionary' : 'Warrior'}
                </span>
                {/* Tooltip */}
                <span className="pointer-events-none absolute right-0 top-full mt-2 w-56 z-10
                  opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 ease-out">
                  <span
                    className="block rounded-xl px-3.5 py-3 text-xs leading-relaxed text-gray-700 font-medium"
                    style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
                  >
                    {net >= 0 ? (
                      <>
                        <span className="block font-bold text-emerald-600 mb-1">💡 Visionary</span>
                        Your income exceeds your expenses — you're building a healthy financial future. Keep growing your savings and investments!
                      </>
                    ) : (
                      <>
                        <span className="block font-bold text-orange-500 mb-1">⚡ Warrior</span>
                        You're spending more than you earn this period. Review your expenses, cut non-essentials, and set a budget to get back on track. All the best!
                      </>
                    )}
                  </span>
                </span>
              </span>
            )}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 rounded-xl px-3" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
              <span className="text-sm text-gray-600">Income</span>
              <span className="text-sm font-bold text-emerald-600">{mask(fmt(summary?.total_income))}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 rounded-xl px-3" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
              <span className="text-sm text-gray-600">Expenses</span>
              <span className="text-sm font-bold text-red-500">{mask(fmt(summary?.total_expense))}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 rounded-xl px-3">
              <span className="text-sm font-semibold text-gray-800">Net Balance</span>
              <span className={`text-sm font-bold ${net >= 0 ? 'text-primary-700' : 'text-orange-600'}`}>
                {mask(fmt(net))}
              </span>
            </div>
          </div>
          <Link
            to="/individual/report"
            className="mt-5 flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
          >
            View Full Report <HiOutlineChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Task Overview */}
        <div
          className="lg:col-span-2 rounded-3xl p-6"
          style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <HiOutlineClipboardDocumentList className="w-5 h-5 text-purple-500" />
              Task Overview
            </h3>
            <Link
              to="/individual/tasks"
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5"
            >
              View all <HiOutlineChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
              <HiOutlineClock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">
                {(summary?.tasks?.total ?? 0) - (summary?.tasks?.completed ?? 0)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Pending</p>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{summary?.tasks?.completed ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Completed</p>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
              <HiOutlineClock className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{summary?.tasks?.due_today ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Due Today</p>
            </div>
          </div>

          <Link
            to="/individual/tasks"
            className="mt-5 block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-primary-600 transition-all"
            style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
          >
            Manage Tasks
          </Link>
        </div>
      </div>

      {/* ─── Quick Actions ───────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          {
            to: '/individual/income?add=1',
            label: 'Add Income',
            icon: HiOutlineArrowTrendingUp,
            iconColor: 'text-emerald-500',
            accent: '#059669',
          },
          {
            to: '/individual/expenses?add=1',
            label: 'Add Expense',
            icon: HiOutlineArrowTrendingDown,
            iconColor: 'text-red-500',
            accent: '#dc2626',
          },
          {
            to: '/individual/budget',
            label: 'My Budget',
            icon: HiOutlineBanknotes,
            iconColor: 'text-amber-500',
            accent: '#d97706',
          },
          {
            to: '/individual/tasks?add=1',
            label: 'New Task',
            icon: HiOutlineClipboardDocumentList,
            iconColor: 'text-purple-500',
            accent: '#7c3aed',
          },
          {
            to: '/individual/shopping',
            label: 'Shopping List',
            icon: HiOutlineShoppingCart,
            iconColor: 'text-sky-500',
            accent: '#0284c7',
          },
          {
            to: '/individual/report',
            label: 'View Report',
            icon: HiOutlineChartBarSquare,
            iconColor: 'text-primary-500',
            accent: '#4f46e5',
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-center transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: '#e8edf5', boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
            >
              <item.icon className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            <span className="text-xs font-semibold text-gray-700 leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ─── Disclaimer ──────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 rounded-2xl px-5 py-4"
        style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
      >
        <span className="text-amber-500 text-lg leading-none mt-0.5">ℹ️</span>
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold">Disclaimer —</span> The Income, Expenses, Tasks, and Notes tracked here are for <span className="font-semibold">personal management only</span> and have no relation to actual business income, expenses, or any other financial records in the system.
        </p>
      </div>
    </div>
  );
}
