import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchSuppliers, createSupplier } from '../store/supplierSlice';
import { supplierApi } from '../api/supplier.api';
import {
  PageHeader, SearchInput, DataTable, Modal, FormField, FormRow,
  LoadingSpinner, Pagination, ActionButton, ActionGroup, Avatar,
} from '../components/common';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

const INITIAL_FORM = { name: '', company: '', phone: '', email: '', address: '', gst_number: '' };

export default function Suppliers() {
  usePageTitle('Suppliers');
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((state) => state.suppliers);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { can } = usePermission();

  useEffect(() => {
    dispatch(fetchSuppliers({ page, limit: 20, search }));
  }, [dispatch, page, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name, company: supplier.company || '', phone: supplier.phone || '',
      email: supplier.email || '', address: supplier.address || '', gst_number: supplier.gst_number || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    try {
      if (editingId) {
        await supplierApi.update(editingId, form);
        toast.success('Supplier updated');
      } else {
        await dispatch(createSupplier(form)).unwrap();
        toast.success('Supplier created');
      }
      setShowModal(false);
      dispatch(fetchSuppliers({ page, limit: 20, search }));
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      await supplierApi.delete(id);
      toast.success('Supplier deleted');
      dispatch(fetchSuppliers({ page, limit: 20, search }));
    } catch {
      toast.error('Failed to delete supplier');
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Suppliers"
        subtitle="Manage your suppliers"
        action={can('suppliers:create') ? 'Add Supplier' : null}
        onAction={openCreate}
      />

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search suppliers..." className="max-w-md" />

      {/* Table */}
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'company', label: 'Company', hideOn: 'sm' },
          { key: 'phone', label: 'Phone', hideOn: 'md' },
          { key: 'gst', label: 'GST', hideOn: 'lg' },
          { key: 'balance', label: 'Balance', align: 'right' },
          { key: 'actions', label: '', align: 'right' },
        ]}
        data={items}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
        renderRow={(s) => (
          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} />
                <span className="font-medium text-gray-900">{s.name}</span>
              </div>
            </td>
            <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{s.company || <span className="text-gray-300">—</span>}</td>
            <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{s.phone || <span className="text-gray-300">—</span>}</td>
            <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell">{s.gst_number || <span className="text-gray-300">—</span>}</td>
            <td className="px-5 py-4 text-right font-medium text-gray-900">₹{s.balance || 0}</td>
            <td className="px-5 py-4">
              <ActionGroup>
                {can('suppliers:update') && <ActionButton variant="edit" onClick={() => openEdit(s)} title="Edit" />}
                {can('suppliers:delete') && <ActionButton variant="delete" onClick={() => handleDelete(s.id, s.name)} title="Delete" />}
              </ActionGroup>
            </td>
          </tr>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input type="text" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
