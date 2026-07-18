import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineArrowTrendingDown,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import Modal from '../../components/common/Modal';

// ── Expense category groups ───────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { group: 'Food & Lifestyle',    items: ['Food & Dining', 'Groceries', 'Personal Care', 'Clothing & Fashion', 'Entertainment'] },
  { group: 'Housing & Utilities', items: ['Housing & Rent', 'Electricity', 'Water', 'Gas', 'Internet & Phone', 'Maintenance'] },
  { group: 'Transport',           items: ['Fuel', 'Public Transport', 'Vehicle EMI', 'Vehicle Insurance', 'Parking & Tolls', 'Cab / Auto'] },
  { group: 'Health',              items: ['Doctor / Hospital', 'Medicines', 'Health Insurance', 'Gym & Fitness'] },
  { group: 'Education',           items: ['School / College Fees', 'Books & Stationery', 'Online Courses', 'Coaching'] },
  { group: 'Finance',             items: ['Loan EMI', 'Credit Card Bill', 'Insurance Premium', 'Savings & Investment', 'Tax Payment'] },
  { group: 'Family & Social',     items: ['Gifts & Donations', 'Family Support', 'Subscriptions', 'Travel & Vacation'] },
  { group: 'Other',               items: ['Miscellaneous', 'Other'] },
];

const ALL_CATEGORIES = EXPENSE_CATEGORIES.flatMap((g) => g.items);
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'other'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const today       = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const firstOfMonth = () => today().substring(0, 8) + '01';
const firstOfYear  = () => today().substring(0, 5) + '01-01';

function prevMonthRange() {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last  = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return { from: fmt(first), to: fmt(last) };
}

function fmtDateTime(dateRaw, createdAt) {
  const date = (() => {
    if (!dateRaw) return '—';
    const part = dateRaw.length > 10 ? dateRaw.substring(0, 10) : dateRaw;
    const [y, m, d] = part.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  })();
  const time = (() => {
    if (!createdAt) return '';
    const dt = new Date(createdAt);
    if (isNaN(dt)) return '';
    return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  })();
  return { date, time };
}

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const pmLabel = (m) => ({ cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank', other: 'Other' }[m] || m);

const BADGE_COLORS = [
  'bg-red-50 text-red-700',
  'bg-orange-50 text-orange-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-pink-50 text-pink-700',
  'bg-fuchsia-50 text-fuchsia-700',
  'bg-purple-50 text-purple-700',
  'bg-indigo-50 text-indigo-700',
];
const categoryColor = (cat) =>
  BADGE_COLORS[Math.abs([...cat].reduce((a, c) => a + c.charCodeAt(0), 0)) % BADGE_COLORS.length];

const emptyForm = {
  category: '', description: '', amount: '', payment_method: 'cash',
  expense_date: today(), notes: '',
};

const getPresets = () => [
  { label: 'Today',      from: today(),        to: today()  },
  { label: 'This Month', from: firstOfMonth(), to: today()  },
  { label: 'Last Month', ...prevMonthRange()               },
  { label: 'This Year',  from: firstOfYear(),  to: today()  },
  { label: 'All Time',   from: '',             to: ''       },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function PersonalExpenses() {
  const location = useLocation();
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [activePreset, setActivePreset] = useState('Today');
  const [filters, setFilters] = useState({
    from: today(), to: today(), category: '',
  });

  // Auto-open modal when navigated with ?add=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('add') === '1') openCreate();
  }, [location.search]);

  useEffect(() => { loadExpenses(); }, [filters]);

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from)     params.from     = filters.from;
      if (filters.to)       params.to       = filters.to;
      if (filters.category) params.category = filters.category;
      const res = await individualApi.getExpenses(params);
      const rows = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setExpenses(rows);
    } catch (err) {
      console.error('loadExpenses error:', err?.message || err);
      toast.error(err?.structured?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // ── Preset ───────────────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setFilters((f) => ({ ...f, from: preset.from, to: preset.to }));
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (exp) => {
    setEditingId(exp.id);
    setForm({
      category:       exp.category,
      description:    exp.description || '',
      amount:         exp.amount,
      payment_method: exp.payment_method || 'cash',
      expense_date:   exp.expense_date?.split('T')[0] || exp.expense_date,
      notes:          exp.notes || '',
    });
    setShowModal(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editingId) {
        await individualApi.updateExpense(editingId, payload);
        toast.success('Expense updated');
      } else {
        await individualApi.createExpense(payload);
        toast.success('Expense recorded');
      }
      setShowModal(false);
      loadExpenses();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await individualApi.deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const total       = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const highest     = expenses.length ? Math.max(...expenses.map((e) => parseFloat(e.amount))) : 0;
  const avgPerEntry = expenses.length ? total / expenses.length : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and manage your personal spending</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineBanknotes className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Total Expenses</p>
            <p className="text-xl font-bold text-red-600">{fmt(total)}</p>
            <p className="text-[10px] text-gray-400">{expenses.length} record{expenses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineArrowTrendingDown className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Highest Entry</p>
            <p className="text-xl font-bold text-gray-800">{fmt(highest)}</p>
            <p className="text-[10px] text-gray-400">Single transaction</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineCalendarDays className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Avg per Entry</p>
            <p className="text-xl font-bold text-gray-800">{fmt(avgPerEntry)}</p>
            <p className="text-[10px] text-gray-400">Based on filtered view</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {/* Quick presets */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 flex-wrap" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
          <HiOutlineFunnel className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {getPresets().map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activePreset === p.label ? 'text-primary-700' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={activePreset === p.label
                ? { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }
                : {}
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date + category row */}
        <div className="flex flex-wrap gap-3 items-end px-5 py-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">From</label>
            <input
              type="date" value={filters.from}
              onChange={(e) => { setActivePreset(''); setFilters({ ...filters, from: e.target.value }); }}
              className="input-field text-sm py-2"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">To</label>
            <input
              type="date" value={filters.to}
              onChange={(e) => { setActivePreset(''); setFilters({ ...filters, to: e.target.value }); }}
              className="input-field text-sm py-2"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input-field text-sm py-2"
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {(filters.from || filters.to || filters.category) && (
            <button
              onClick={() => { setActivePreset('Today'); setFilters({ from: today(), to: today(), category: '' }); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 py-2 px-3 rounded-xl transition-all"
              style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
            >
              <HiOutlineXMark className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {loading ? (
          <div className="flex justify-center py-14">
            <span className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
              <HiOutlineArrowTrendingDown className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No expenses for this period</p>
            <p className="text-xs text-gray-400 mt-1">Change Date Range to view Expenses</p>
            <button onClick={openCreate} className="mt-4 btn-primary text-sm flex items-center gap-1.5">
              <HiOutlinePlus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: 'rgba(200,207,216,0.4)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider hidden sm:table-cell">Description</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgba(200,207,216,0.2)' }}>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-[180px] truncate">
                      {exp.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {fmt(exp.amount)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {pmLabel(exp.payment_method)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {(() => { const { date, time } = fmtDateTime(exp.expense_date, exp.created_at); return (<><span>{date}</span>{time && <span className="block text-[11px] text-gray-400">{time}</span>}</>); })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(exp)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer total */}
            <div className="flex items-center justify-between px-5 py-3 bg-violet-50 border-t border-violet-100">
              <span className="text-xs text-violet-700">
                <strong>{expenses.length}</strong> record{expenses.length !== 1 ? 's' : ''}
              </span>
              {(filters.from || filters.to) && (
                <span className="text-xs text-violet-600 flex items-center gap-1">
                  <HiOutlineCalendarDays className="w-3.5 h-3.5" />
                  {filters.from && filters.to
                    ? `${filters.from} → ${filters.to}`
                    : filters.from
                      ? `From ${filters.from}`
                      : `Up to ${filters.to}`
                  }
                </span>
              )}
              <span className="text-sm font-bold text-violet-700">Total: {fmt(total)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Expense' : 'Record Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input-field" placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="e.g. Swiggy order, EMI payment"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="input-field"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{pmLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date" required value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field" placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting
                ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</span>
                : editingId ? 'Update Expense' : 'Save Expense'
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
