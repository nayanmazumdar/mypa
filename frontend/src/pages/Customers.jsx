import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchCustomers, createCustomer } from '../store/customerSlice';
import { customerApi } from '../api/customer.api';
import api from '../api/axios';
import {
  PageHeader, SearchInput, DataTable, ActionButton, ActionGroup,
  Modal, FormField, FormRow, Avatar, LoadingSpinner, ExportButton,
} from '../components/common';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

const INITIAL_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  usePageTitle('Customers');
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((state) => state.customers);
  const [showModal, setShowModal] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [ledgerData, setLedgerData] = useState({ customer: null, entries: [] });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const { can } = usePermission();

  useEffect(() => {
    dispatch(fetchCustomers({ page, limit: 20, search }));
  }, [dispatch, page, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditingId(customer.id);
    setForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', notes: customer.notes || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editingId) {
        await customerApi.update(editingId, form);
        toast.success('Customer updated');
      } else {
        await dispatch(createCustomer(form)).unwrap();
        toast.success('Customer created');
      }
      setShowModal(false);
      dispatch(fetchCustomers({ page, limit: 20, search }));
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await customerApi.delete(id);
      toast.success('Customer deleted');
      dispatch(fetchCustomers({ page, limit: 20, search }));
    } catch {
      toast.error('Failed to delete customer');
    }
  };

  const openLedger = async (customer) => {
    try {
      const res = await api.get(`/customers/${customer.id}/ledger`);
      setLedgerData({ customer, entries: res.data || [] });
      setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
      setShowLedger(true);
    } catch {
      toast.error('Failed to load ledger');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await api.post(`/customers/${ledgerData.customer.id}/payment`, { amount: parseFloat(paymentForm.amount), payment_method: paymentForm.payment_method, notes: paymentForm.notes || null });
      toast.success('Payment recorded');
      setShowLedger(false);
      dispatch(fetchCustomers({ page, limit: 20, search }));
    } catch {
      toast.error('Failed to record payment');
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        subtitle="Manage your customer base"
        action={can('customers:create') ? 'Add Customer' : null}
        onAction={openCreate}
      >
        <ExportButton entity="customers" canImport />
      </PageHeader>

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by name, phone, email..."
        className="max-w-md"
      />

      {/* Table */}
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone', hideOn: 'sm' },
          { key: 'email', label: 'Email', hideOn: 'md' },
          { key: 'balance', label: 'Balance', align: 'right' },
          { key: 'status', label: 'Status', hideOn: 'lg' },
          { key: 'actions', label: '', align: 'right' },
        ]}
        data={items}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
        renderRow={(c) => (
          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <span className="font-medium text-gray-900">{c.name}</span>
              </div>
            </td>
            <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{c.phone || <span className="text-gray-300">—</span>}</td>
            <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{c.email || <span className="text-gray-300">—</span>}</td>
            <td className="px-5 py-4 text-right font-medium">
              <span className={parseFloat(c.balance) > 0 ? 'text-red-600' : 'text-emerald-600'}>₹{c.balance || 0}</span>
            </td>
            <td className="px-5 py-4 hidden lg:table-cell">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-5 py-4">
              <ActionGroup>
                {can('customers:ledger') && parseFloat(c.balance) > 0 && <ActionButton variant="payment" onClick={() => openLedger(c)} title="Record Payment" />}
                {can('customers:update') && <ActionButton variant="edit" onClick={() => openEdit(c)} title="Edit" />}
                {can('customers:delete') && <ActionButton variant="delete" onClick={() => handleDelete(c.id, c.name)} title="Delete" />}
              </ActionGroup>
            </td>
          </tr>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <FormRow>
            <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="9876543210" />
            <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="customer@email.com" />
          </FormRow>
          <FormField label="Address" type="textarea" rows={2} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <FormField label="Notes" type="textarea" rows={2} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Ledger / Payment Modal */}
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title={`Payment - ${ledgerData.customer?.name || ''}`}>
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl text-center">
            <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-700 mt-1">₹{ledgerData.customer?.balance || 0}</p>
          </div>

          {ledgerData.entries.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500"><th className="text-left py-1">Type</th><th className="text-right py-1">Amount</th><th className="text-left py-1">Date</th></tr></thead>
                <tbody>
                  {ledgerData.entries.slice(0, 10).map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className={`py-1 ${e.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>{e.type}</td>
                      <td className="py-1 text-right">₹{e.amount}</td>
                      <td className="py-1 text-gray-500">{new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handlePayment} className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Record Payment</p>
            <FormRow>
              <FormField label="Amount" type="number" step="0.01" min="0.01" required value={paymentForm.amount} onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })} placeholder="₹" />
              <FormField label="Method" type="select" value={paymentForm.payment_method} onChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })} options={[
                { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
              ]} />
            </FormRow>
            <FormField label="Notes" value={paymentForm.notes} onChange={(v) => setPaymentForm({ ...paymentForm, notes: v })} placeholder="Optional" />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowLedger(false)} className="btn-secondary text-sm">Close</button>
              <button type="submit" className="btn-primary text-sm">Record Payment</button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
