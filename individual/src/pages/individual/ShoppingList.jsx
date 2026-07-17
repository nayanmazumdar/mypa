import { useState, useEffect } from 'react';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineShoppingCart,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlinePencil,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'mypa_shopping_list';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   dot: 'bg-amber-400',  text: 'text-amber-700',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', dot: 'bg-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400',    text: 'text-red-600',    badge: 'bg-red-50 text-red-600 border-red-200' },
};

const CATEGORIES = ['Grocery', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Household', 'Personal Care', 'Electronics', 'Clothing', 'Medicine', 'Other'];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function ShoppingList() {
  const [items,      setItems]      = useState(() => loadItems());
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search,     setSearch]     = useState('');
  const [form,       setForm]       = useState({ name: '', qty: '', unit: '', category: 'Grocery', note: '', date: new Date().toISOString().slice(0, 10) });

  // Persist to localStorage on every change
  useEffect(() => { saveItems(items); }, [items]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', qty: '', unit: '', category: 'Grocery', note: '', date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ name: item.name, qty: item.qty || '', unit: item.unit || '', category: item.category || 'Grocery', note: item.note || '', date: item.date || new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...form, name: form.name.trim() } : i));
      toast.success('Item updated');
    } else {
      const newItem = { id: generateId(), ...form, name: form.name.trim(), status: 'pending', createdAt: new Date().toISOString() };
      setItems(prev => [newItem, ...prev]);
      toast.success('Item added');
    }
    setShowModal(false);
  };

  const setStatus = (id, status) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const deleteItem = (id, name) => {
    if (!confirm(`Remove "${name}" from list?`)) return;
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item removed');
  };

  const clearCompleted = () => {
    if (!confirm('Clear all completed items?')) return;
    setItems(prev => prev.filter(i => i.status !== 'completed'));
    toast.success('Completed items cleared');
  };

  const clearAll = () => {
    if (!confirm('Clear entire shopping list?')) return;
    setItems([]);
    toast.success('List cleared');
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = items
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || '').toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:       items.length,
    pending:   items.filter(i => i.status === 'pending').length,
    completed: items.filter(i => i.status === 'completed').length,
    cancelled: items.filter(i => i.status === 'cancelled').length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineShoppingCart className="w-6 h-6 text-primary-600" />
            My Cart
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {counts.pending} pending · {counts.completed} completed · {counts.cancelled} cancelled
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* ── Filter + Search ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all',       label: `All (${counts.all})` },
            { key: 'pending',   label: `Pending (${counts.pending})` },
            { key: 'completed', label: `Done (${counts.completed})` },
            { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === t.key ? 'text-primary-700' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={filterStatus === t.key
                ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }
                : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <input
          type="text" placeholder="Search items…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-36 text-sm py-1.5"
        />
      </div>

      {/* ── Progress bar ── */}
      {items.length > 0 && (
        <div className="rounded-2xl px-5 py-4" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</span>
            <span className="text-xs font-bold text-gray-700">
              {counts.completed} of {items.length} done
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#d1d9e6' }}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: items.length ? `${(counts.completed / items.length) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* ── Tick hint ── */}
      {items.length > 0 && (
        <p className="text-xs text-primary-500">☑ Tick if completed!</p>
      )}

      {/* ── List ── */}
      <div className="rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HiOutlineShoppingCart className="w-14 h-14 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Your shopping list is empty</p>
            <p className="text-xs text-gray-400 mt-1">Tap "Add Item" to start your list</p>
            <button onClick={openCreate} className="mt-5 btn-primary text-sm flex items-center gap-1.5">
              <HiOutlinePlus className="w-4 h-4" /> Add First Item
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">No items match your filter.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'rgba(200,207,216,0.3)' }}>
            {filtered.map(item => {
              const sc = STATUS_CONFIG[item.status];
              const isDone      = item.status === 'completed';
              const isCancelled = item.status === 'cancelled';
              return (
                <li key={item.id} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/20 ${isDone ? 'opacity-60' : ''}`}>

                  {/* Status dot / quick-complete toggle */}
                  <button
                    onClick={() => setStatus(item.id, item.status === 'completed' ? 'pending' : 'completed')}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300 hover:border-emerald-400'
                    }`}
                    title={isDone ? 'Mark pending' : 'Mark done'}
                  >
                    {isDone && <HiOutlineCheck className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold text-gray-800 ${isDone ? 'line-through' : ''} ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                        {item.name}
                      </span>
                      {(item.qty || item.unit) && (
                        <span className="text-xs text-gray-400">
                          {item.qty}{item.unit ? ` ${item.unit}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {item.category}
                        </span>
                      )}
                      {item.note && (
                        <span className="text-[11px] text-gray-400 italic truncate max-w-[180px]">{item.note}</span>
                      )}
                      {item.date && (
                        <span className="text-[10px] text-gray-400">{item.date}</span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.badge} flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Mark pending */}
                    {item.status !== 'pending' && (
                      <button
                        onClick={() => setStatus(item.id, 'pending')}
                        className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Mark Pending"
                      >
                        <HiOutlineArrowPath className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Mark cancelled */}
                    {item.status !== 'cancelled' && (
                      <button
                        onClick={() => setStatus(item.id, 'cancelled')}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(item.id, item.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer actions */}
        {items.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(200,207,216,0.3)' }}>
            <span className="text-xs text-gray-400">{filtered.length} item{filtered.length !== 1 ? 's' : ''} shown</span>
            <div className="flex gap-2">
              {counts.completed > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Clear Completed
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl bg-primary-50">
              <h2 className="text-base font-semibold text-primary-800 flex items-center gap-2">
                <HiOutlineShoppingCart className="w-5 h-5" />
                {editingId ? 'Edit Item' : 'Add Item'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Item Name *</label>
                <input
                  type="text" required autoFocus
                  placeholder="e.g. Milk, Bread, Apples"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Qty + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 2, 500"
                    value={form.qty}
                    onChange={e => setForm({ ...form, qty: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. kg, L, pcs"
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat} type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        form.category === cat ? 'text-primary-700 font-semibold' : 'text-gray-600'
                      }`}
                      style={form.category === cat
                        ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }
                        : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</label>
                <input
                  type="text"
                  placeholder="Optional note (brand, store, etc.)"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-1.5">
                  <HiOutlineCheck className="w-4 h-4" />
                  {editingId ? 'Update' : 'Add to List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
