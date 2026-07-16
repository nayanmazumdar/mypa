import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  const { items, pagination, loading } = useSelector((state) => state.sales);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [saleDetail, setSaleDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { can } = usePermission();

  // Create sale form
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saleForm, setSaleForm] = useState({ customer_id: '', payment_method: 'cash', payment_status: 'paid', discount: 0, notes: '' });
  const [saleItems, setSaleItems] = useState([{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }]);

  useEffect(() => {
    dispatch(fetchSales({ page, limit: 20, status: statusFilter || undefined, search: search || undefined }));
  }, [dispatch, page, statusFilter, search]);

  const openCreate = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        api.get('/products', { params: { limit: 200 } }),
        api.get('/customers', { params: { limit: 200 } }),
      ]);
      setProducts(prodRes.data || []);
      setCustomers(custRes.data || []);
    } catch { /* fallback empty */ }
    setSaleForm({ customer_id: '', payment_method: 'cash', payment_status: 'paid', discount: 0, notes: '' });
    setSaleItems([{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }]);
    setShowCreateModal(true);
  };

  const openDetail = async (sale) => {
    try {
      const res = await salesApi.getById(sale.id);
      setSaleDetail(res.data || res);
      setShowDetailModal(true);
    } catch {
      toast.error('Failed to load sale details');
    }
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

  const handlePrintInvoice = async (saleId) => {
    try {
      const res = await salesApi.getInvoice(saleId);
      const invoice = res.data || res;
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) { toast.error('Please allow popups to print'); return; }
      const items = invoice.items || [];
      const shop = invoice.shop || {};
      const sale = invoice.sale || {};
      printWindow.document.write(`
        <html><head><title>Invoice ${sale.invoice_number || ''}</title>
        <style>body{font-family:monospace;font-size:12px;padding:20px;max-width:380px;margin:0 auto}
        .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
        table{width:100%;border-collapse:collapse}td{padding:2px 0}.right{text-align:right}</style></head>
        <body>
        <div class="center bold">${shop.shop_name || 'Shop'}</div>
        <div class="center">${shop.address || ''}</div>
        <div class="center">${shop.phone ? 'Ph: ' + shop.phone : ''}</div>
        <div class="line"></div>
        <div>Invoice: ${sale.invoice_number || ''}</div>
        <div>Date: ${sale.sale_date || ''}</div>
        ${sale.customer_name ? '<div>Customer: ' + sale.customer_name + '</div>' : ''}
        <div class="line"></div>
        <table><tr class="bold"><td>Item</td><td class="right">Qty</td><td class="right">Price</td><td class="right">Total</td></tr>
        ${items.map(i => `<tr><td>${i.product_name}</td><td class="right">${i.quantity}</td><td class="right">₹${i.unit_price}</td><td class="right">₹${i.total}</td></tr>`).join('')}
        </table>
        <div class="line"></div>
        <table>
        <tr><td>Subtotal</td><td class="right">₹${sale.total_amount}</td></tr>
        ${parseFloat(sale.discount) > 0 ? `<tr><td>Discount</td><td class="right">-₹${sale.discount}</td></tr>` : ''}
        <tr class="bold"><td>Total</td><td class="right">₹${sale.net_amount}</td></tr>
        <tr><td>Payment</td><td class="right">${sale.payment_method || 'cash'}</td></tr>
        </table>
        <div class="line"></div>
        <div class="center">Thank you for your business!</div>
        <script>window.onload=function(){window.print();}</script>
        </body></html>
      `);
      printWindow.document.close();
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
          { value: 'completed', label: 'Completed' },
          { value: 'pending', label: 'Pending' },
          { value: 'cancelled', label: 'Cancelled' },
        ]} />
      </div>

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
              ) : items.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-primary-600 text-sm">{sale.invoice_number}</td>
                  <td className="px-5 py-4 text-gray-700">{sale.customer_name || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">₹{sale.net_amount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      sale.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      sale.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>{sale.payment_status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      sale.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      sale.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{sale.status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden sm:table-cell">{sale.sale_date}</td>
                  <td className="px-5 py-4 text-right">
                    <ActionGroup>
                      <ActionButton variant="view" onClick={() => openDetail(sale)} title="View Details" />
                      {can('sales:update') && sale.status !== 'cancelled' && (
                        <ActionButton variant="cancel" onClick={() => handleCancelSale(sale.id)} title="Cancel Sale" />
                      )}
                    </ActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
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
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{saleDetail.sale_date}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{saleDetail.status}</span></div>
              <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{saleDetail.payment_method}</span></div>
              <div><span className="text-gray-500">Payment Status:</span> <span className="font-medium">{saleDetail.payment_status}</span></div>
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
            </div>
            <div className="flex justify-end">
              <button onClick={() => handlePrintInvoice(saleDetail.id)} className="btn-secondary text-sm flex items-center gap-1">
                <HiOutlineEye className="w-4 h-4" /> Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
