import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineXCircle,
  HiOutlinePlusCircle,
  HiOutlineBanknotes,
  HiOutlineBellAlert,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import Modal from '../../components/common/Modal';

// ── Major category groups (group names are the budget keys) ──────────────────
const EXPENSE_GROUPS = [
  'Food & Lifestyle',
  'Housing & Utilities',
  'Transport',
  'Health',
  'Education',
  'Finance',
  'Family & Social',
  'Travel & Tours',
  'Other',
];

// Sub-items per group — shown as reference in the modal
const GROUP_ITEMS = {
  'Food & Lifestyle':    ['Food & Dining', 'Groceries', 'Personal Care', 'Clothing & Fashion', 'Entertainment'],
  'Housing & Utilities': ['Housing & Rent', 'Electricity', 'Water', 'Gas', 'Internet & Phone', 'Maintenance'],
  'Transport':           ['Fuel', 'Public Transport', 'Vehicle EMI', 'Vehicle Insurance', 'Parking & Tolls', 'Cab / Auto'],
  'Health':              ['Doctor / Hospital', 'Medicines', 'Health Insurance', 'Gym & Fitness'],
  'Education':           ['School / College Fees', 'Books & Stationery', 'Online Courses', 'Coaching'],
  'Finance':             ['Loan EMI', 'Credit Card Bill', 'Insurance Premium', 'Savings & Investment', 'Tax Payment'],
  'Family & Social':     ['Gifts & Donations', 'Family Support', 'Subscriptions', 'Travel & Vacation'],
  'Travel & Tours':      ['Flight Tickets', 'Train / Bus Tickets', 'Hotel & Accommodation', 'Tour Package', 'Travel Insurance', 'Sightseeing & Activities', 'Food while Travelling', 'Visa & Passport Fees', 'Travel Accessories', 'Other Travel'],
  'Other':               ['Miscellaneous', 'Other'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct  = (spent, limit) => (limit > 0 ? Math.min((spent / limit) * 100, 100) : 0);

function statusInfo(spent, limit) {
  if (limit <= 0) return { color: 'text-gray-400', bar: 'bg-gray-300', label: 'No limit set', icon: null };
  const ratio = spent / limit;
  if (ratio >= 1)   return { color: 'text-red-500',    bar: 'bg-red-400',    label: 'Over budget',  icon: HiOutlineXCircle };
  if (ratio >= 0.8) return { color: 'text-amber-500',  bar: 'bg-amber-400',  label: 'Near limit',   icon: HiOutlineExclamationTriangle };
  return               { color: 'text-emerald-500', bar: 'bg-emerald-400', label: 'On track',     icon: HiOutlineCheckCircle };
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const neoBox   = { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' };
const neoInset = { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' };

// ── Alert banner (shown when one or more groups exceed budget) ─────────────────
function BudgetAlerts({ alerts, month, year, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;
  const monthName = MONTHS[month - 1];
  return (
    <div
      className="rounded-2xl overflow-hidden"
      role="alert"
      aria-live="polite"
      style={{ border: '1.5px solid #fca5a5' }}
    >
      {/* Banner header */}
      <div className="flex items-center justify-between px-5 py-3 bg-red-50">
        <div className="flex items-center gap-2">
          <HiOutlineBellAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm font-bold text-red-700">
            {alerts.length === 1
              ? '1 category exceeded its budget'
              : `${alerts.length} categories exceeded their budget`
            } — {monthName} {year}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss alerts"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>
      </div>

      {/* Individual alert rows */}
      <div className="divide-y divide-red-100">
        {alerts.map(a => (
          <div key={a.group} className="flex items-center justify-between px-5 py-3 bg-red-50/60">
            <div className="flex items-center gap-3">
              <HiOutlineXCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">{a.group}</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Spent {fmt(a.spent)} · Budget {fmt(a.limit)} · Over by{' '}
                  <span className="font-bold">{fmt(a.overspent)}</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
              {Math.round((a.spent / a.limit) * 100)}% used
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal: set / edit a group budget ──────────────────────────────────────────
function BudgetFormModal({ existingBudgets, onClose, onSave }) {
  // Build initial state: one entry per group, pre-filled with existing limits
  const [limits, setLimits] = useState(() => {
    const map = {};
    existingBudgets.forEach(b => { map[b.category] = b.monthly_limit; });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (group, value) => {
    setLimits(prev => ({ ...prev, [group]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Collect only groups with a positive value entered
    const entries = EXPENSE_GROUPS
      .map(g => ({ category: g, monthly_limit: parseFloat(limits[g]) || 0 }))
      .filter(e => e.monthly_limit > 0);

    if (entries.length === 0) {
      toast.error('Enter a limit for at least one category');
      return;
    }
    setSaving(true);
    try {
      await onSave(entries);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Set Monthly Budgets" size="md">
      <form onSubmit={handleSubmit}>
        <p className="text-xs text-gray-500 mb-4">
          Enter a monthly spending limit for each category group. Leave blank to skip.
        </p>

        <div className="space-y-2">
          {EXPENSE_GROUPS.map(group => (
            <div
              key={group}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}
            >
              {/* Group name + sub-items preview */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{group}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {GROUP_ITEMS[group]?.slice(0, 3).join(' · ')}
                  {GROUP_ITEMS[group]?.length > 3 ? '…' : ''}
                </p>
              </div>

              {/* ₹ amount input */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-sm text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={limits[group] ?? ''}
                  onChange={e => handleChange(group, e.target.value)}
                  placeholder="—"
                  aria-label={`Monthly limit for ${group}`}
                  className="w-28 px-3 py-1.5 rounded-lg text-sm text-gray-800 text-right outline-none focus:ring-2 focus:ring-primary-300"
                  style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600"
            style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)' }}
          >
            {saving ? 'Saving…' : 'Save Budgets'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Budget card ───────────────────────────────────────────────────────────────
function BudgetCard({ item, onEdit, onDelete }) {
  const { color, bar, label, icon: StatusIcon } = statusInfo(item.spent, item.monthly_limit);
  const progress = pct(item.spent, item.monthly_limit);
  const subItems = GROUP_ITEMS[item.category] || [];

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        ...neoBox,
        ...(item.exceeded ? { border: '1.5px solid #fca5a5' } : {}),
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{item.category}</p>
          {StatusIcon && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${color}`}>
              <StatusIcon className="w-3 h-3" /> {label}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
            style={neoBox}
            aria-label={`Edit budget for ${item.category}`}
          >
            <HiOutlinePencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.category)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            style={neoBox}
            aria-label={`Remove budget for ${item.category}`}
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-items hint */}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        {subItems.slice(0, 3).join(' · ')}{subItems.length > 3 ? ` + ${subItems.length - 3} more` : ''}
      </p>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full overflow-hidden" style={neoInset}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Amounts */}
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">
          Spent: <span className="font-bold text-gray-800">{fmt(item.spent)}</span>
        </span>
        <span className="text-gray-500">
          {item.remaining >= 0
            ? <>Left: <span className="font-bold text-emerald-600">{fmt(item.remaining)}</span></>
            : <>Over: <span className="font-bold text-red-500">{fmt(Math.abs(item.remaining))}</span></>
          }
        </span>
      </div>

      <div className="text-[10px] text-gray-400 text-center">
        Limit: <span className="font-semibold text-gray-600">{fmt(item.monthly_limit)}</span>
        {item.monthly_limit > 0 && (
          <>&nbsp;·&nbsp;<span className={`font-semibold ${color}`}>{item.pct_used}% used</span></>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PersonalBudget() {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState(null);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setAlertsDismissed(false); // re-show alerts when month changes or data reloads
    try {
      const res = await individualApi.getBudgets({ year, month });
      setData(res.data);
    } catch {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (entries) => {
    // entries is an array of { category, monthly_limit }
    // attach year + month so the backend scopes the record to the viewed period
    await Promise.all(entries.map(e => individualApi.upsertBudget({ ...e, year, month })));
    toast.success(entries.length === 1 ? 'Budget saved' : `${entries.length} budgets saved`);
    load();
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Remove budget for "${category}"?`)) return;
    try {
      const period = year * 100 + month;   // e.g. 202607
      await individualApi.deleteBudget(period, category);
      toast.success('Budget removed');
      load();
    } catch {
      toast.error('Failed to remove budget');
    }
  };

  const budgets           = data?.budgets  || [];
  const alerts            = data?.alerts   || [];
  const budgetedGroups    = new Set(budgets.map(b => b.category));
  const unbudgetedGroups  = EXPENSE_GROUPS.filter(g => !budgetedGroups.has(g));

  const totalLimit = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overCount  = budgets.filter(b => b.exceeded).length;
  const nearCount  = budgets.filter(b => b.monthly_limit > 0 && b.pct_used >= 80 && !b.exceeded).length;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-6">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineBanknotes className="w-6 h-6 text-primary-500" />
            My Budget
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monthly spending limits by major category group
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center rounded-2xl" style={neoBox} aria-label="Month navigation">
          <button
            onClick={prevMonth}
            className="px-3 py-2 rounded-xl text-gray-500 hover:text-primary-700 text-sm font-bold transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center px-1">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrent}
            className="px-3 py-2 rounded-xl text-gray-500 hover:text-primary-700 text-sm font-bold transition-colors disabled:opacity-30"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* ─── Alert banners ──────────────────────────────────────────────── */}
      {!alertsDismissed && (
        <BudgetAlerts
          alerts={alerts}
          month={month}
          year={year}
          onDismiss={() => setAlertsDismissed(true)}
        />
      )}

      {/* ─── Summary stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Limit',
            value: fmt(totalLimit),
            color: 'text-primary-600',
            sub: null,
          },
          {
            label: 'Total Spent',
            value: fmt(totalSpent),
            color: totalSpent > totalLimit && totalLimit > 0 ? 'text-red-500' : 'text-gray-800',
            sub: null,
          },
          {
            label: 'Groups Tracked',
            value: `${budgets.length} / ${EXPENSE_GROUPS.length}`,
            color: 'text-gray-800',
            sub: null,
          },
          {
            label: 'Over Budget',
            value: overCount > 0 ? `${overCount} group${overCount > 1 ? 's' : ''}` : (nearCount > 0 ? `${nearCount} near limit` : 'All clear'),
            color: overCount > 0 ? 'text-red-500' : nearCount > 0 ? 'text-amber-500' : 'text-emerald-600',
            sub: null,
          },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={neoBox}>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-[9px] text-gray-400 mt-0.5 italic">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ─── Controls bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setModal({ mode: 'add' })}
          disabled={unbudgetedGroups.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
          Set Budget
        </button>
      </div>

      {/* ─── Budget cards ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-14 rounded-3xl" style={neoBox}>
          <HiOutlineBanknotes className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No budgets set for {MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-gray-400 mt-1">Click <strong>Set Budget</strong> to add a monthly limit for a category group</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(item => (
            <BudgetCard
              key={item.category}
              item={item}
              onEdit={() => setModal({ mode: 'edit' })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ─── Unbudgeted groups hint ──────────────────────────────────────── */}
      {!loading && unbudgetedGroups.length > 0 && budgets.length > 0 && (
        <div className="rounded-2xl px-5 py-4" style={neoInset}>
          <p className="text-xs font-semibold text-gray-500 mb-2">Groups without a budget:</p>
          <div className="flex flex-wrap gap-2">
            {unbudgetedGroups.map(g => (
              <button
                key={g}
                onClick={() => setModal({ mode: 'add' })}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-primary-700 font-medium transition-colors flex items-center gap-1"
                style={neoBox}
              >
                <HiOutlinePlusCircle className="w-3 h-3" />
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────── */}
      {modal && (
        <BudgetFormModal
          existingBudgets={budgets}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
