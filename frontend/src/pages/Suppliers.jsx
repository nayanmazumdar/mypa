import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,
  HiOutlineBuildingStorefront, HiOutlineMagnifyingGlass, HiOutlineXMark,
  HiOutlinePhone, HiOutlineEnvelope, HiOutlineArrowPath,
  HiOutlineIdentification, HiOutlineMapPin,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { supplierApi } from '../api/supplier.api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const INITIAL_FORM = {
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  gst_number: '',
};

export default function Suppliers() {
  const location = useLocation();

  const [suppliers, setSuppliers]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');

  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);

  const debounceRef = useRef(null);

  // ── load ──────────────────────────────────────────────────────
  const load = useCallback(async (pg = 1, q = '') => {
    setLoading(true);
    try {
      const res = await supplierApi.getAll({
        page: pg, limit: 20,
        ...(q && { search: q }),
      });
      setSuppliers(res.data || []);
      setPagination(res.pagination || null);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time this route is visited
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

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name:       s.name        || '',
      company:    s.company     || '',
      phone:      s.phone       || '',
      email:      s.email       || '',
      address:    s.address     || '',
      gst_number: s.gst_number  || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await supplierApi.update(editingId, form);
        toast.success('Supplier updated');
      } else {
        await supplierApi.create(form);
        toast.success('Supplier added');
      }
      setShowModal(false);
      load(page, search);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    setDeleting(s.id);
    try {
      await supplierApi.delete(s.id);
      toast.success('Supplier deleted');
      load(page, search);
    } catch {
      toast.error('Failed to delete supplier');
    } finally {
      setDeleting(null);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (loading && suppliers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500">
            {pagination?.total ?? suppliers.length} supplier{(pagination?.total ?? suppliers.length) !== 1 ? 's' : ''}
          </p>
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
            <HiOutlinePlus className="w-5 h-5" /> Add Supplier
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="card flex items-center gap-3 py-3">
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, company, phone or email…"
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">GST No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <HiOutlineBuildingStorefront className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      {search ? `No suppliers match "${search}"` : 'No suppliers yet'}
                    </p>
                    {!search && (
                      <p className="text-gray-400 text-xs mt-1">
                        Click "Add Supplier" to get started
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                suppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {(page - 1) * 20 + idx + 1}
                    </td>

                    {/* Name + address */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.address && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px] flex items-center gap-1">
                              <HiOutlineMapPin className="w-3 h-3 shrink-0" />
                              {s.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 text-gray-600">
                      {s.company
                        ? <span className="flex items-center gap-1">
                            <HiOutlineBuildingStorefront className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {s.company}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3">
                      {s.phone
                        ? <a href={`tel:${s.phone}`}
                            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 transition-colors">
                            <HiOutlinePhone className="w-3.5 h-3.5 shrink-0" />
                            {s.phone}
                          </a>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      {s.email
                        ? <a href={`mailto:${s.email}`}
                            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 transition-colors max-w-[180px] truncate">
                            <HiOutlineEnvelope className="w-3.5 h-3.5 shrink-0" />
                            {s.email}
                          </a>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* GST */}
                    <td className="px-4 py-3">
                      {s.gst_number
                        ? <span className="inline-flex items-center gap-1 font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                            <HiOutlineIdentification className="w-3 h-3" />
                            {s.gst_number}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          aria-label="Edit supplier"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deleting === s.id}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          aria-label="Delete supplier"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p, search); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(p, search); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
              >
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
        title={editingId ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              className="input-field"
              placeholder="e.g. Ramesh Traders"
              {...field('name')}
            />
          </div>

          {/* Company + GST */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                className="input-field"
                placeholder="Company name"
                {...field('company')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                className="input-field uppercase"
                placeholder="e.g. 22ABCDE1234F1Z5"
                maxLength={15}
                {...field('gst_number')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gst_number: e.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                className="input-field"
                placeholder="Mobile / landline"
                {...field('phone')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="email@example.com"
                {...field('email')}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              rows={2}
              className="input-field resize-none"
              placeholder="Street, city, state…"
              {...field('address')}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50 min-w-[110px]"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
