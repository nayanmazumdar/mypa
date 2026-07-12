import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,
  HiOutlineUser, HiOutlineMagnifyingGlass, HiOutlineXMark,
  HiOutlinePhone, HiOutlineEnvelope, HiOutlineShoppingBag,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { customerApi } from '../api/customer.api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const INITIAL_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const location = useLocation();   // changes on every navigation to this route
  const [customers, setCustomers]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');

  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);

  const debounceRef = useRef(null);

  // ── load ──────────────────────────────────────────────────────
  const load = useCallback(async (pg = 1, q = '') => {
    setLoading(true);
    try {
      const res = await customerApi.getAll({
        page: pg, limit: 20,
        ...(q && { search: q }),
      });
      setCustomers(res.data || []);
      setPagination(res.pagination || null);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time this route is navigated to (location.key changes on each visit)
  useEffect(() => {
    setPage(1);
    setSearch('');
    load(1, '');
  }, [location.key, load]);

  // debounced search
  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, value), 400);
  };

  // ── modal helpers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name || '', phone: c.phone || '',
      email: c.email || '', address: c.address || '', notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await customerApi.update(editingId, form);
        toast.success('Customer updated');
      } else {
        await customerApi.create(form);
        toast.success('Customer added');
      }
      setShowModal(false);
      load(page, search);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await customerApi.delete(c.id);
      toast.success('Customer deleted');
      load(page, search);
    } catch {
      toast.error('Failed to delete customer');
    }
  };

  if (loading && customers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">{pagination?.total ?? customers.length} customers from POS &amp; records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(1); load(1, search); }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="Refresh"
          >
            <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add Customer
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="card flex items-center gap-3">
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        {search && (
          <button onClick={() => handleSearch('')} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total Spent</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Visits</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Visit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center">
                    <HiOutlineUser className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {search ? `No customers match "${search}".` : 'No POS transactions or customers yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr key={c.id ?? `walkin-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                          c.source === 'walkin'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-primary-100 text-primary-700'
                        }`}>
                          {c.source === 'walkin'
                            ? <HiOutlineShoppingBag className="w-4 h-4" />
                            : c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.address && <p className="text-xs text-gray-400 truncate max-w-[140px]">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.phone
                        ? <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                            <HiOutlinePhone className="w-3.5 h-3.5" />{c.phone}
                          </a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary-600 max-w-[160px] truncate">
                            <HiOutlineEnvelope className="w-3.5 h-3.5 shrink-0" />{c.email}
                          </a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* POS data */}
                    <td className="px-4 py-3 text-right">
                      {parseFloat(c.total_spent) > 0
                        ? <span className="font-semibold text-green-700">
                            ₹{parseFloat(c.total_spent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(c.visit_count) > 0
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {c.visit_count}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {c.last_visit
                        ? new Date(c.last_visit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${parseFloat(c.balance) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {parseFloat(c.balance) > 0
                          ? `₹${parseFloat(c.balance).toLocaleString('en-IN')}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.source === 'walkin' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Walk-in
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.source === 'walkin' ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)}
                            className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                            aria-label="Edit">
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            aria-label="Delete">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p, search); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">
                ← Prev
              </button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(p, search); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Customer' : 'Add New Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Customer full name" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field" placeholder="Mobile number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="email@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea rows={2} value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field" placeholder="Street, city…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input type="text" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field" placeholder="Any notes about this customer" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
