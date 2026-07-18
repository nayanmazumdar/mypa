import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineArrowTrendingUp,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import Modal from '../../components/common/Modal';

// ── Income head groups ────────────────────────────────────────────────────────
const INCOME_HEADS = [
  { group: 'Employment',          items: ['Salary', 'Bonus', 'Overtime Pay', 'Incentive', 'Gratuity', 'Arrears'] },
  { group: 'Business & Freelance',items: ['Freelance', 'Business Profit', 'Consulting Fees', 'Commission', 'Professional Fees'] },
  { group: 'Investments',         items: ['Interest Income', 'Dividends', 'Capital Gains', 'Mutual Fund Returns', 'Stock Returns', 'Crypto'] },
  { group: 'Property',            items: ['Rental Income', 'Property Sale', 'Lease Income'] },
  { group: 'Family & Social',     items: ['Gift', 'Inheritance', 'Family Support', 'Festival Bonus'] },
  { group: 'Government & Benefits',items: ['Pension', 'Provident Fund', 'Scholarship', 'Subsidy', 'Tax Refund'] },
  { group: 'Other',               items: ['Side Income', 'Lottery / Prize', 'Cashback / Rewards', 'Other'] },
];
const ALL_SOURCES = INCOME_HEADS.flatMap((g) => g.items);
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'other'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const today      = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const firstOfMonth = () => today().substring(0, 8) + '01';
const firstOfYear  = () => today().substring(0, 5) + '01-01';

function prevMonthRange() {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last  = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return { from: fmt(first), to: fmt(last) };
}

// Fix UTC timestamp display — income_date is a DATE column; created_at carries the real timestamp
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

const emptyForm = {
  source: '', description: '', amount: '', payment_method: 'bank_transfer',
  income_date: today(), notes: '',
};

// ── Quick-filter presets ──────────────────────────────────────────────────────
const getPresets = () => [
  { label: 'Today',      from: today(),        to: today()  },
  { label: 'This Month', from: firstOfMonth(), to: today()  },
  { label: 'Last Month', ...prevMonthRange()               },
  { label: 'This Year',  from: firstOfYear(),  to: today()  },
  { label: 'All Time',   from: '',             to: ''       },
];

// ── Payment method label ──────────────────────────────────────────────────────
const pmLabel = (m) => ({ cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank', other: 'Other' }[m] || m);

// ── Source badge color (cycles through a palette) ────────────────────────────
const BADGE_COLORS = [
  'bg-green-50 text-green-700',
  'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700',
  'bg-amber-50 text-amber-700',
  'bg-teal-50 text-teal-700',
  'bg-rose-50 text-rose-700',
  'bg-indigo-50 text-indigo-700',
];
const sourceColor = (src) => BADGE_COLORS[Math.abs([...src].reduce((a, c) => a + c.charCodeAt(0), 0)) % BADGE_COLORS.length];

// ═══════════════════════════════════════════════════════════════════════════════
export default function PersonalIncome() {
  const location = useLocation();
  const [incomes,    setIncomes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [activePreset, setActivePreset] = useState('Today');
  const [filters, setFilters] = useState({
    from: today(), to: today(), source: '',
  });

  // Auto-open modal when navigated with ?add=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('add') === '1') openCreate();
  }, [location.search]);

  useEffect(() => { loadIncomes(); }, [filters]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadIncomes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from)   params.from   = filters.from;
      if (filters.to)     params.to     = filters.to;
      if (filters.source) params.source = filters.source;
      const res = await individualApi.getIncomes(params);
      // res is already response.data from axios interceptor: { success, data, pagination }
      const rows = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setIncomes(rows);
    } catch (err) {
      console.error('loadIncomes error:', err?.response?.data || err?.message || err);
      toast.error(err?.structured?.message || err?.message || 'Failed to load income records');
    } finally {
      setLoading(false);
    }
  };

  // ── Preset apply ────────────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setFilters((f) => ({ ...f, from: preset.from, to: preset.to }));
  };

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (inc) => {
    setEditingId(inc.id);
    setForm({
      source:         inc.source,
      description:    inc.description || '',
      amount:         inc.amount,
      payment_method: inc.payment_method || 'bank_transfer',
      income_date:    inc.income_date?.split('T')[0] || inc.income_date,
      notes:          inc.notes || '',
    });
    setShowModal(true);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editingId) {
        await individualApi.updateIncome(editingId, payload);
        toast.success('Income updated');
      } else {
        await individualApi.createIncome(payload);
        toast.success('Income recorded');
      }
      setShowModal(false);
      loadIncomes();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save income');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this income record?')) return;
    try {
      await individualApi.deleteIncome(id);
      toast.success('Income deleted');
      loadIncomes();
    } catch {
      toast.error('Failed to delete income record');
    }
  };

  // ── Summary stats ───────────────────────────────────────────────────────────
  const total      = incomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const highest    = incomes.length ? Math.max(...incomes.map((i) => parseFloat(i.amount))) : 0;
  const avgPerEntry= incomes.length ? total / incomes.length : 0;

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Income</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all your income sources</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineBanknotes className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Total Income</p>
            <p className="text-xl font-bold text-green-600">{fmt(total)}</p>
            <p className="text-xs text-gray-400">{incomes.length} record{incomes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineArrowTrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Highest Entry</p>
            <p className="text-xl font-bold text-gray-800">{fmt(highest)}</p>
            <p className="text-xs text-gray-400">Single transaction</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <HiOutlineCalendarDays className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Avg per Entry</p>
            <p className="text-xl font-bold text-gray-800">{fmt(avgPerEntry)}</p>
            <p className="text-xs text-gray-400">Based on filtered view</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {/* Quick presets */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-200/60 flex-wrap">
          <HiOutlineFunnel className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {getPresets().map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activePreset === p.label
                  ? 'text-indigo-700 font-semibold'
                  : 'text-gray-600'
              }`}
              style={activePreset === p.label
                ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }
                : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date + source row */}
        <div className="flex flex-wrap gap-3 items-end px-4 py-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => { setActivePreset(''); setFilters({ ...filters, from: e.target.value }); }}
              className="input-field text-sm py-1.5 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => { setActivePreset(''); setFilters({ ...filters, to: e.target.value }); }}
              className="input-field text-sm py-1.5 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Income Head</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="input-field text-sm py-1.5"
            >
              <option value="">All heads</option>
              {INCOME_HEADS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((s) => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {(filters.from || filters.to || filters.source) && (
            <button
              onClick={() => { setActivePreset('Today'); setFilters({ from: today(), to: today(), source: '' }); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 py-1.5 px-2.5 border border-gray-200 rounded-lg"
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
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <HiOutlineArrowTrendingUp className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No income records for this period</p>
            <p className="text-xs text-gray-400 mt-1">Change Date Range to view Income</p>
            <button onClick={openCreate} className="mt-4 btn-primary text-sm flex items-center gap-1.5">
              <HiOutlinePlus className="w-4 h-4" /> Add Income
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: '#c8cfd8' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Income Head</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Description</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sourceColor(inc.source)}`}>
                        {inc.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-[180px] truncate">
                      {inc.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {fmt(inc.amount)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {pmLabel(inc.payment_method)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {(() => { const { date, time } = fmtDateTime(inc.income_date, inc.created_at); return (<><span>{date}</span>{time && <span className="block text-[11px] text-gray-400">{time}</span>}</>); })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(inc)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inc.id)}
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
            <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-t border-violet-100">
              <span className="text-sm text-violet-700">
                <strong>{incomes.length}</strong> record{incomes.length !== 1 ? 's' : ''}
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
        title={editingId ? 'Edit Income Entry' : 'Record Income'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Income Head *</label>
              <select
                required
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="input-field"
              >
                <option value="">Select income head</option>
                {INCOME_HEADS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((s) => <option key={s} value={s}>{s}</option>)}
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
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="e.g. June salary, Project payment"
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
                type="date" required
                value={form.income_date}
                onChange={(e) => setForm({ ...form, income_date: e.target.value })}
                className="input-field font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
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
                : editingId ? 'Update Income' : 'Save Income'
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
