import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineEye, HiOutlineXCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchSales, createSale } from '../store/salesSlice';
import { salesApi } from '../api/sales.api';
import api from '../api/axios';
import {
  PageHeader, SearchInput, FilterTabs, Modal,
  LoadingSpinner, Pagination, ActionButton, ActionGroup, ExportButton,
} from '../components/common';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Sales() {
  usePageTitle('Sales');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, pagination, loading } = useSelector((state) => state.sales);
  const { user } = useSelector((state) => state.auth);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [saleDetail, setSaleDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { can, role } = usePermission();

  // Date filter - default to today
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());

  // Create sale form
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saleForm, setSaleForm] = useState({ customer_id: '', payment_method: 'cash', payment_status: 'paid', discount: 0, notes: '' });
  const [saleItems, setSaleItems] = useState([{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }]);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [savingPay, setSavingPay] = useState(false);
  const [payHistory, setPayHistory] = useState([]);

  useEffect(() => {
    dispatch(fetchSales({ page, limit: 20, status: statusFilter || undefined, search: search || undefined, start_date: startDate, end_date: endDate }));
  }, [dispatch, page, statusFilter, search, startDate, endDate]);

  const openCreate = () => {
    navigate('/pos');
  };

  const [detailPayHistory, setDetailPayHistory] = useState([]);

  const openDetail = async (sale) => {
    // Use the data already available from the list
    setSaleDetail({ ...sale });
    setShowDetailModal(true);
    // Load payment history
    const refType = sale.type === 'pos' ? 'pos' : 'sale';
    try {
      const histRes = await api.get(`/payments/history/${refType}/${sale.id}`);
      setDetailPayHistory(histRes.data || []);
    } catch { setDetailPayHistory([]); }

    // Try to load full details (items) in the background
    try {
      if (sale.type === 'pos') {
        const res = await api.get(`/pos/transactions/${sale.id}`);
        setSaleDetail(prev => ({ ...prev, ...res.data, type: 'pos' }));
      } else {
        const res = await salesApi.getById(sale.id);
        const data = res.data || res;
        setSaleDetail(prev => ({ ...prev, ...data, type: 'invoice' }));
      }
    } catch { /* keep using basic data from list */ }
  };

  const handleProductChange = (idx, productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    const updated = [...saleItems];
    updated[idx] = { ...updated[idx], product_id: productId, unit_price: product ? parseFloat(product.selling_price) : 0 };
    setSaleItems(updated);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...saleItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setSaleItems(updated);
  };

  const addItem = () => setSaleItems([...saleItems, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }]);
  const removeItem = (idx) => { if (saleItems.length > 1) setSaleItems(saleItems.filter((_, i) => i !== idx)); };

  const getTotal = () => {
    const itemsTotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price - (item.discount || 0)), 0);
    return Math.max(0, itemsTotal - (parseFloat(saleForm.discount) || 0));
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    const validItems = saleItems.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    try {
      await dispatch(createSale({
        items: validItems.map(i => ({ product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price), discount: parseFloat(i.discount) || 0 })),
        customer_id: saleForm.customer_id ? parseInt(saleForm.customer_id) : null,
        payment_method: saleForm.payment_method,
        payment_status: saleForm.payment_status,
        discount: parseFloat(saleForm.discount) || 0,
        notes: saleForm.notes || null,
      })).unwrap();
      toast.success('Sale created');
      setShowCreateModal(false);
      dispatch(fetchSales({ page, limit: 20 }));
    } catch (err) {
      toast.error(err || 'Failed to create sale');
    }
  };

  const handleCancelSale = async (id) => {
    if (!confirm('Cancel this sale?')) return;
    try {
      await salesApi.updateStatus(id, 'cancelled');
      toast.success('Sale cancelled');
      dispatch(fetchSales({ page, limit: 20, status: statusFilter || undefined }));
    } catch {
      toast.error('Failed to cancel sale');
    }
  };

  const openPayModal = async (sale) => {
    setPayTarget(sale);
    setPayForm({ amount: '', payment_method: 'cash', notes: '' });
    setPayHistory([]);
    setShowPayModal(true);
    // Load payment history
    try {
      const refType = sale.type === 'pos' ? 'pos' : 'sale';
      const res = await api.get(`/payments/history/${refType}/${sale.id}`);
      setPayHistory(res.data || []);
    } catch { /* ignore */ }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payTarget) return;
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const netAmt = parseFloat(payTarget.net_amount) || 0;
    const paidAmt = parseFloat(payTarget.paid_amount) || 0;
    const maxDue = Math.max(netAmt - paidAmt, 0);
    if (amount > maxDue) { toast.error(`Amount cannot exceed due balance of ₹${maxDue.toFixed(2)}`); return; }
    setSavingPay(true);
    try {
      const refType = payTarget.type === 'pos' ? 'pos' : 'sale';
      await api.post('/payments', {
        reference_type: refType,
        reference_id: payTarget.id,
        amount,
        payment_method: payForm.payment_method,
        notes: payForm.notes || null,
      });
      toast.success('Payment recorded');
      setShowPayModal(false);
      setPayTarget(null);
      dispatch(fetchSales({ page, limit: 20, status: statusFilter || undefined }));
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to record payment');
    } finally { setSavingPay(false); }
  };

  const handlePrintInvoice = async (saleId) => {
    try {
      // Use already-loaded saleDetail if available, otherwise fetch
      let data = saleDetail;
      if (!data || data.id !== saleId) {
        if (saleDetail?.type === 'pos') {
          const res = await api.get(`/pos/transactions/${saleId}`);
          data = res.data;
        } else {
          const res = await salesApi.getInvoice(saleId);
          data = (res.data || res)?.sale || res.data || res;
        }
      }

      const items = data.items || [];
      const shopName = data.shop_name || user?.shop_name || 'Shop';
      const invoiceNo = data.invoice_number || data.receipt_number || '';
      const dateStr = data.sale_date
        ? new Date(data.sale_date).toLocaleDateString('en-IN')
        : new Date(data.created_at).toLocaleDateString('en-IN');
      const timeStr = new Date(data.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const customerName = data.customer_name || '';
      const totalAmount = parseFloat(data.total_amount || 0).toFixed(2);
      const discount = parseFloat(data.discount || 0).toFixed(2);
      const netAmount = parseFloat(data.net_amount || 0).toFixed(2);
      const paymentMethod = (data.payment_method || 'cash').toUpperCase();

      // Payment info
      const paidTotal = detailPayHistory.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      const balance = Math.max(parseFloat(netAmount) - paidTotal, 0);

      const itemsHtml = items.map(i =>
        `<tr><td style="padding:3px 0">${i.product_name || i.name || ''}</td><td class="right">${i.quantity}</td><td class="right">₹${parseFloat(i.unit_price || i.price || 0).toFixed(2)}</td><td class="right">₹${parseFloat(i.total || (i.quantity * (i.unit_price || i.price || 0))).toFixed(2)}</td></tr>`
      ).join('');

      const w = window.open('', '_blank', 'width=400,height=700');
      if (!w) { toast.error('Allow pop-ups to print.'); return; }

      w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoiceNo}</title>
<style>
@page { margin: 0; size: 80mm auto; }
@media screen { body { max-width: 380px; margin: 0 auto; padding: 16px; } }
@media print { body { width: 72mm; max-width: 72mm; padding: 3mm; } }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; color: #000; }
.center { text-align: center; }
.bold { font-weight: bold; }
.right { text-align: right; }
.line { border-top: 1px dashed #000; margin: 8px 0; }
.dline { border-top: 2px solid #000; margin: 8px 0; }
table { width: 100%; border-collapse: collapse; }
.row { display: flex; justify-content: space-between; }
.total-row { font-size: 14px; font-weight: bold; }
.paid { color: green; }
.due { color: red; font-weight: bold; }
</style></head><body>

<div class="center bold" style="font-size:14px">${shopName}</div>
<div class="line"></div>

<div class="center bold">— Tax Invoice —</div>
<div class="row"><span>Invoice:</span><span class="bold">${invoiceNo}</span></div>
<div class="row"><span>Date:</span><span>${dateStr} at ${timeStr}</span></div>
${customerName ? `<div class="row"><span>Customer:</span><span class="bold">${customerName}</span></div>` : ''}
<div class="line"></div>

<table>
<tr class="bold"><td>Item</td><td class="right">Qty</td><td class="right">Price</td><td class="right">Total</td></tr>
<tr><td colspan="4"><div class="line" style="margin:4px 0"></div></td></tr>
${itemsHtml}
</table>

<div class="dline"></div>
<table>
<tr><td>Subtotal</td><td class="right">₹${totalAmount}</td></tr>
${parseFloat(discount) > 0 ? `<tr><td>Discount</td><td class="right">-₹${discount}</td></tr>` : ''}
<tr class="total-row"><td>Net Total</td><td class="right">₹${netAmount}</td></tr>
<tr><td>Payment</td><td class="right">${paymentMethod}</td></tr>
${paidTotal > 0 ? `<tr class="paid"><td>Paid</td><td class="right">₹${paidTotal.toFixed(2)}</td></tr>` : ''}
${balance > 0 ? `<tr class="due"><td>Balance Due</td><td class="right">₹${balance.toFixed(2)}</td></tr>` : ''}
</table>

<div class="dline"></div>
<div class="center">Thank you for your business!</div>
<div class="center" style="margin-top:3px;font-size:9px;color:#666">Exchange/Return within 7 days with this bill.</div>
<div class="center" style="margin-top:6px;font-size:8px;color:#999">Invoice: ${invoiceNo} | Generated: ${new Date().toLocaleString('en-IN')}</div>
<div class="center" style="margin-top:2px;font-size:8px;color:#aaa">Billing powered by MyPA</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`);
      w.document.close();
    } catch {
      toast.error('Failed to load invoice');
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        subtitle="Track your sales and invoices"
        action={can('sales:create') ? 'New Sale' : null}
        onAction={openCreate}
      >
        <ExportButton entity="sales" />
      </PageHeader>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by invoice..." className="flex-1 min-w-[200px] max-w-md" />
        <FilterTabs value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[
          { value: '', label: 'All' },
          { value: 'paid', label: 'Paid' },
          { value: 'unpaid', label: 'Unpaid' },
          { value: 'partial', label: 'Partial' },
        ]} />
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">From:</label>
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field w-auto text-sm" />
        <label className="text-sm font-medium text-gray-700">To:</label>
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field w-auto text-sm" />
        <button onClick={() => { setStartDate(getLocalDate()); setEndDate(getLocalDate()); setPage(1); }} className="text-xs text-primary-600 font-medium hover:text-primary-700">Today</button>
      </div>

      {/* Sales Summary */}
      {items.length > 0 && (() => {
        const t = { total: 0, cash: 0, upi: 0, card: 0, bank_transfer: 0, balanceDue: 0 };
        const billerTotals = {};
        items.forEach(sale => {
          const amt = parseFloat(sale.net_amount) || 0;
          const paidAmt = parseFloat(sale.paid_amount) || 0;
          t.total += amt;
          const method = (sale.payment_method || 'cash').toLowerCase();
          if (method !== 'credit') { if (t[method] !== undefined) t[method] += amt; else t.cash += amt; }
          if (sale.payment_status === 'partial' || sale.payment_status === 'unpaid') t.balanceDue += Math.max(amt - paidAmt, 0);
          if (role === 'admin') {
            const name = sale.biller_name || 'Unknown';
            if (!billerTotals[name]) billerTotals[name] = { count: 0, revenue: 0 };
            billerTotals[name].count += 1;
            billerTotals[name].revenue += amt;
          }
        });
        return (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sales Summary</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-4 text-sm">
                {t.cash > 0 && <span className="text-gray-800 font-medium">Cash: <b>₹{t.cash.toFixed(2)}</b></span>}
                {t.upi > 0 && <span className="text-gray-800 font-medium">UPI: <b>₹{t.upi.toFixed(2)}</b></span>}
                {t.card > 0 && <span className="text-gray-800 font-medium">Card: <b>₹{t.card.toFixed(2)}</b></span>}
                {t.bank_transfer > 0 && <span className="text-gray-800 font-medium">Bank: <b>₹{t.bank_transfer.toFixed(2)}</b></span>}
                {t.balanceDue > 0 && <span className="text-red-700 font-medium">Balance Due: <b>₹{t.balanceDue.toFixed(2)}</b></span>}
              </div>
              <span className="text-base font-bold text-primary-700 px-4 py-2 rounded-xl" style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>Total: ₹{t.total.toFixed(2)}</span>
            </div>
            {role === 'admin' && Object.keys(billerTotals).length > 0 && (
              <div className="pt-3" style={{ borderTop: '1px solid rgba(200,207,216,0.4)' }}>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Staff Performance</p>
                <StaffSalesChart billerTotals={billerTotals} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Table */}
      <div className="rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "rgba(200,207,216,0.2)" }}>
              <tr>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Payment</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Date</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {items.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-14 text-center text-gray-400 text-sm">No sales recorded yet.</td></tr>
              ) : items.map((sale) => {
                const netAmt = parseFloat(sale.net_amount) || 0;
                const paidAmt = parseFloat(sale.paid_amount) || 0;
                const dueAmt = Math.max(netAmt - paidAmt, 0);
                const hasPartialPay = paidAmt > 0 && paidAmt < netAmt;
                return (
                <tr key={`${sale.type}-${sale.id}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-primary-600 text-sm">
                    <div>{sale.invoice_number}</div>
                    {sale.biller_name && <div className="text-[10px] text-gray-400 font-normal">by {sale.biller_name}</div>}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{sale.customer_name || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="px-5 py-4 text-right">
                    {hasPartialPay ? (
                      <div>
                        <span className="line-through text-gray-400 text-xs">₹{netAmt.toFixed(2)}</span>
                        <span className="block font-bold text-red-600">₹{dueAmt.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className={`font-semibold ${sale.payment_status === 'unpaid' ? 'text-red-600' : 'text-gray-900'}`}>₹{netAmt.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      sale.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      sale.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>{sale.payment_status} <span className="text-[10px] font-semibold ml-1 text-blue-600">({sale.payment_method})</span></span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      sale.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      sale.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{sale.status}</span>
                  </td>
                  <td className="px-5 py-4 text-xs hidden sm:table-cell">
                    <div className="text-gray-700">{new Date(sale.created_at).toLocaleDateString('en-IN')}</div>
                    <div className="text-gray-400">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ActionGroup>
                      <ActionButton variant="view" onClick={() => openDetail(sale)} title="View Details" />
                      {can('payments:create') && sale.payment_status !== 'paid' && sale.status !== 'cancelled' && (
                        <ActionButton variant="primary" onClick={() => openPayModal(sale)} title="Record Payment" />
                      )}
                      {can('sales:update') && sale.status !== 'cancelled' && (
                        <ActionButton variant="cancel" onClick={() => handleCancelSale(sale.id)} title="Cancel Sale" />
                      )}
                    </ActionGroup>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary - moved to top */}

        {pagination && (
          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        )}
      </div>

      {/* Create Sale Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Sale">
        <form onSubmit={handleCreateSale} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={saleForm.customer_id} onChange={(e) => setSaleForm({ ...saleForm, customer_id: e.target.value })} className="input w-full">
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={saleForm.payment_method} onChange={(e) => setSaleForm({ ...saleForm, payment_method: e.target.value })} className="input w-full">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items *</label>
              <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {saleItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={item.product_id} onChange={(e) => handleProductChange(idx, e.target.value)} className="input flex-1 text-sm">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>)}
                  </select>
                  <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="input w-16 text-sm" placeholder="Qty" />
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} className="input w-20 text-sm" placeholder="Price" />
                  {saleItems.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:text-red-700">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
              <input type="number" min="0" step="0.01" value={saleForm.discount} onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select value={saleForm.payment_status} onChange={(e) => setSaleForm({ ...saleForm, payment_status: e.target.value })} className="input w-full">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid (Credit)</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={saleForm.notes} onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })} className="input w-full" />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
            <span className="font-medium text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-900">₹{getTotal().toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Sale</button>
          </div>
        </form>
      </Modal>

      {/* Sale Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Sale - ${saleDetail?.invoice_number || ''}`}>
        {saleDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{saleDetail.sale_date ? new Date(saleDetail.sale_date).toLocaleDateString('en-IN') : new Date(saleDetail.created_at).toLocaleDateString('en-IN')}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`font-medium ${saleDetail.payment_method === 'credit' && saleDetail.payment_status !== 'paid' ? 'text-red-600' : 'text-green-600'}`}>{saleDetail.payment_method === 'credit' && saleDetail.payment_status !== 'paid' ? 'Pending' : 'Paid All'}</span></div>
              <div><span className="text-gray-500">Payment:</span> <span className="font-medium capitalize">{saleDetail.payment_method}</span></div>
            </div>
            {saleDetail.items && saleDetail.items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b"><th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th></tr></thead>
                  <tbody>
                    {saleDetail.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1">{item.product_name || `Product #${item.product_id}`}</td>
                        <td className="py-1 text-right">{item.quantity}</td>
                        <td className="py-1 text-right">₹{item.unit_price}</td>
                        <td className="py-1 text-right font-medium">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{saleDetail.total_amount}</span></div>
              {parseFloat(saleDetail.discount) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-₹{saleDetail.discount}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Net Amount</span><span>₹{saleDetail.net_amount}</span></div>
              {(() => {
                const paidTotal = detailPayHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                const netAmt = parseFloat(saleDetail.net_amount) || 0;
                const balance = Math.max(netAmt - paidTotal, 0);
                const isCreditSale = saleDetail.payment_method === 'credit';
                if (!isCreditSale && paidTotal === 0) return null;
                return (
                  <>
                    <div className="flex justify-between items-center pt-1 border-t mt-1">
                      <span className="text-green-700 font-semibold">Paid</span>
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">₹{paidTotal.toFixed(2)}</span>
                    </div>
                    {balance > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-red-700 font-semibold">Balance Due</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">₹{balance.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex justify-end">
              <button onClick={() => handlePrintInvoice(saleDetail.id)} className="btn-secondary text-sm flex items-center gap-1">
                <HiOutlineEye className="w-4 h-4" /> Print Invoice
              </button>
            </div>
            {/* Payment History */}
            {detailPayHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-gray-500 uppercase">Payment History</p>
                <div className="space-y-1">
                  {detailPayHistory.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100 text-xs">
                      <div>
                        <span className="font-semibold text-green-700">₹{parseFloat(p.amount).toFixed(2)}</span>
                        <span className="text-gray-500 ml-2 capitalize">{p.payment_method}</span>
                        {p.notes && <span className="text-gray-400 ml-2">— {p.notes}</span>}
                      </div>
                      <span className="text-gray-400 text-[10px]">{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayModal} onClose={() => { setShowPayModal(false); setPayTarget(null); }} title="Record Payment">
        {payTarget && (() => {
          const netAmount = parseFloat(payTarget.net_amount) || 0;
          const paidAmount = parseFloat(payTarget.paid_amount) || 0;
          const dueAmount = Math.max(netAmount - paidAmount, 0);
          return (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-medium">{payTarget.invoice_number}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Original Amount</span>
                <span className={`font-bold ${paidAmount > 0 ? 'line-through text-gray-400' : ''}`}>₹{netAmount.toFixed(2)}</span>
              </div>
              {paidAmount > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Already Paid</span><span className="font-medium text-green-600">₹{paidAmount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-gray-700 font-semibold">Due Balance</span>
                <span className="font-bold text-red-600 text-base">₹{dueAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment History */}
            {payHistory.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-500 uppercase">Payment History</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {payHistory.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100 text-xs">
                      <div>
                        <span className="font-medium text-green-700">₹{parseFloat(p.amount).toFixed(2)}</span>
                        <span className="text-gray-400 ml-2">{p.payment_method}</span>
                        {p.notes && <span className="text-gray-400 ml-2">— {p.notes}</span>}
                      </div>
                      <span className="text-gray-400 text-[10px]">{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dueAmount > 0 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                  <input type="number" step="0.01" min="0.01" max={dueAmount} required value={payForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) <= dueAmount) setPayForm({ ...payForm, amount: val });
                    }}
                    className="input-field" placeholder={`Max ₹${dueAmount.toFixed(2)}`} />
                  <p className="text-[10px] text-gray-400 mt-1">Enter partial or full amount up to ₹{dueAmount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="input-field">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    className="input-field" placeholder="Optional note" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowPayModal(false); setPayTarget(null); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingPay} className="btn-primary">{savingPay ? 'Saving...' : 'Record Payment'}</button>
                </div>
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-green-600 font-semibold">✓ Fully Paid</p>
                <button type="button" onClick={() => { setShowPayModal(false); setPayTarget(null); }} className="btn-secondary mt-3">Close</button>
              </div>
            )}
          </form>
          );
        })()}
      </Modal>
    </div>
  );
}

// ─── Staff Sales Donut Chart ──────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

function StaffSalesChart({ billerTotals }) {
  const entries      = Object.entries(billerTotals).sort((a, b) => b[1].revenue - a[1].revenue);
  const totalRevenue = entries.reduce((s, [, d]) => s + d.revenue, 0);
  const totalBills   = entries.reduce((s, [, d]) => s + d.count, 0);

  // SVG donut parameters
  const SIZE   = 140;          // viewBox size
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const R      = 52;           // outer radius
  const INNER  = 32;           // inner radius (hole)
  const GAP    = 2;            // degrees between segments

  // Build arc path segments
  const segments = [];
  let cursor = -90; // start at 12 o'clock

  entries.forEach(([name, data], i) => {
    const pct      = data.revenue / totalRevenue;
    const degrees  = pct * 360 - GAP;
    const startRad = (cursor * Math.PI) / 180;
    const endRad   = ((cursor + degrees) * Math.PI) / 180;

    const x1 = CX + R * Math.cos(startRad);
    const y1 = CY + R * Math.sin(startRad);
    const x2 = CX + R * Math.cos(endRad);
    const y2 = CY + R * Math.sin(endRad);
    const ix1 = CX + INNER * Math.cos(startRad);
    const iy1 = CY + INNER * Math.sin(startRad);
    const ix2 = CX + INNER * Math.cos(endRad);
    const iy2 = CY + INNER * Math.sin(endRad);
    const large = degrees > 180 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${INNER} ${INNER} 0 ${large} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    segments.push({ name, data, color: PALETTE[i % PALETTE.length], d, pct });
    cursor += pct * 360;
  });

  const [hovered, setHovered] = useState(null);
  const active = hovered !== null ? segments[hovered] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

      {/* ── Donut SVG ── */}
      <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Inset shadow ring (decorative) */}
          <circle
            cx={CX} cy={CY} r={R + 4}
            fill="none"
            stroke="rgba(200,207,216,0.5)"
            strokeWidth="2"
          />
          <circle
            cx={CX} cy={CY} r={INNER - 4}
            fill="#e8edf5"
          />

          {/* Segments */}
          {segments.map((seg, i) => (
            <path
              key={seg.name}
              d={seg.d}
              fill={seg.color}
              opacity={hovered === null || hovered === i ? 1 : 0.35}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
                transformOrigin: `${CX}px ${CY}px`,
                transform: hovered === i ? 'scale(1.06)' : 'scale(1)',
                filter: hovered === i ? `drop-shadow(0 0 6px ${seg.color}88)` : 'none',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Centre label — shows hovered or default total */}
          <text
            x={CX} y={CY - 7}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={active ? active.color : '#374151'}
            style={{ transition: 'fill 0.2s' }}
          >
            {active
              ? `₹${active.data.revenue >= 1000 ? (active.data.revenue / 1000).toFixed(1) + 'k' : active.data.revenue.toFixed(0)}`
              : `₹${totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'k' : totalRevenue.toFixed(0)}`}
          </text>
          <text
            x={CX} y={CY + 7}
            textAnchor="middle"
            fontSize="8"
            fill={active ? active.color : '#9ca3af'}
            style={{ transition: 'fill 0.2s' }}
          >
            {active ? `${active.pct * 100 < 1 ? '<1' : (active.pct * 100).toFixed(0)}%` : `${totalBills} bills`}
          </text>
        </svg>
      </div>

      {/* ── Legend table ── */}
      <div className="flex-1 w-full space-y-2">
        {segments.map((seg, i) => {
          const sharePct = (seg.pct * 100).toFixed(1);
          const isActive = hovered === i;
          return (
            <div
              key={seg.name}
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 cursor-default"
              style={{
                background: isActive
                  ? `${seg.color}12`
                  : '#e8edf5',
                boxShadow: isActive
                  ? `inset 2px 2px 5px ${seg.color}22, inset -2px -2px 5px #ffffff`
                  : 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff',
                opacity: hovered !== null && !isActive ? 0.5 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Colour swatch */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}88` }}
              />

              {/* Name */}
              <span className="flex-1 text-xs font-semibold text-gray-800 truncate min-w-0">
                {seg.name}
              </span>

              {/* Bills badge */}
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: seg.color + '18', color: seg.color }}
              >
                {seg.data.count} bills
              </span>

              {/* Revenue */}
              <span className="text-xs font-bold flex-shrink-0" style={{ color: seg.color, minWidth: '52px', textAlign: 'right' }}>
                ₹{seg.data.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>

              {/* Share % */}
              <span className="text-[10px] text-gray-400 flex-shrink-0 w-8 text-right">
                {sharePct}%
              </span>
            </div>
          );
        })}

        {/* Footer totals */}
        <div
          className="flex items-center justify-between pt-2 text-xs text-gray-500"
          style={{ borderTop: '1px solid rgba(200,207,216,0.4)' }}
        >
          <span>{entries.length} staff · {totalBills} bills</span>
          <span className="font-bold text-gray-800">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}


