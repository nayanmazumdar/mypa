import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlineEye, HiOutlineXCircle, HiOutlineTrash } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchPurchases, createPurchase } from '../store/purchaseSlice';
import { purchaseApi } from '../api/purchase.api';
import api from '../api/axios';
import {
  PageHeader, SearchInput, FilterTabs, Modal,
  LoadingSpinner, Pagination, ActionButton, ActionGroup, ExportButton,
} from '../components/common';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Purchase() {
  usePageTitle('Purchases');
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((state) => state.purchases);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [purchaseDetail, setPurchaseDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { can, role } = usePermission();

  // Create form
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: '', payment_method: 'cash', payment_status: 'paid', discount: 0, notes: '' });
  const [purchaseItems, setPurchaseItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);

  // Add Supplier sub-modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', company: '', phone: '' });
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Add Product sub-modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', purchase_price: '', selling_price: '', unit: 'piece' });
  const [productLoading, setProductLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchPurchases({ page, limit: 20, status: statusFilter || undefined, search: search || undefined }));
  }, [dispatch, page, statusFilter, search]);

  const openCreate = async () => {
    if (role === 'staff') {
      toast('Contact admin for the purchases!', { icon: 'ℹ️' });
      return;
    }
    try {
      const [prodRes, suppRes] = await Promise.all([
        api.get('/products', { params: { limit: 200 } }),
        api.get('/suppliers', { params: { limit: 200 } }),
      ]);
      setProducts(prodRes.data || []);
      setSuppliers(suppRes.data || []);
    } catch { /* fallback empty */ }
    setPurchaseForm({ supplier_id: '', payment_method: 'cash', payment_status: 'paid', discount: 0, notes: '' });
    setPurchaseItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setShowCreateModal(true);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierForm.name.trim()) return;
    setSupplierLoading(true);
    try {
      const res = await api.post('/suppliers', {
        name: newSupplierForm.name.trim(),
        company: newSupplierForm.company.trim() || undefined,
        phone: newSupplierForm.phone.trim() || undefined,
      });
      const created = res.data?.data || res.data;
      toast.success('Supplier created');
      setNewSupplierForm({ name: '', company: '', phone: '' });
      setShowSupplierModal(false);
      // Refresh suppliers list and auto-select the new one
      const suppRes = await api.get('/suppliers', { params: { limit: 200 } });
      setSuppliers(suppRes.data || []);
      if (created?.id) setPurchaseForm((prev) => ({ ...prev, supplier_id: String(created.id) }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create supplier');
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.purchase_price || !newProductForm.selling_price) return;
    setProductLoading(true);
    try {
      const res = await api.post('/products', {
        name: newProductForm.name.trim(),
        purchase_price: parseFloat(newProductForm.purchase_price),
        selling_price: parseFloat(newProductForm.selling_price),
        mrp: parseFloat(newProductForm.selling_price),
        unit: newProductForm.unit,
      });
      const created = res.data?.data || res.data;
      toast.success('Product created');
      setNewProductForm({ name: '', purchase_price: '', selling_price: '', unit: 'piece' });
      setShowProductModal(false);
      // Refresh products list
      const prodRes = await api.get('/products', { params: { limit: 200 } });
      setProducts(prodRes.data || []);
      // Auto-add as a new item row with the created product selected
      if (created?.id) {
        setPurchaseItems((prev) => [...prev, { product_id: String(created.id), quantity: 1, unit_price: parseFloat(newProductForm.purchase_price) || 0 }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setProductLoading(false);
    }
  };

  const openDetail = async (purchase) => {
    try {
      const res = await purchaseApi.getById(purchase.id);
      setPurchaseDetail(res.data || res);
      setShowDetailModal(true);
    } catch {
      toast.error('Failed to load purchase details');
    }
  };

  const handleProductChange = (idx, productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    const updated = [...purchaseItems];
    updated[idx] = { ...updated[idx], product_id: productId, unit_price: product ? parseFloat(product.purchase_price) : 0 };
    setPurchaseItems(updated);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...purchaseItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setPurchaseItems(updated);
  };

  const addItem = () => setPurchaseItems([...purchaseItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (idx) => { if (purchaseItems.length > 1) setPurchaseItems(purchaseItems.filter((_, i) => i !== idx)); };

  const getTotal = () => {
    const itemsTotal = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    return Math.max(0, itemsTotal - (parseFloat(purchaseForm.discount) || 0));
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    const validItems = purchaseItems.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    try {
      await dispatch(createPurchase({
        items: validItems.map(i => ({ product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) })),
        ...(purchaseForm.supplier_id ? { supplier_id: parseInt(purchaseForm.supplier_id) } : {}),
        payment_method: purchaseForm.payment_method,
        payment_status: purchaseForm.payment_status,
        discount: parseFloat(purchaseForm.discount) || 0,
        notes: purchaseForm.notes || null,
      })).unwrap();
      toast.success('Purchase recorded');
      setShowCreateModal(false);
      dispatch(fetchPurchases({ page, limit: 20 }));
    } catch (err) {
      toast.error(err || 'Failed to create purchase');
    }
  };

  const handleCancelPurchase = async (id) => {
    if (!confirm('Cancel this purchase?')) return;
    try {
      await purchaseApi.updateStatus(id, 'cancelled');
      toast.success('Purchase cancelled');
      dispatch(fetchPurchases({ page, limit: 20, status: statusFilter || undefined }));
    } catch {
      toast.error('Failed to cancel purchase');
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Purchases"
        subtitle="Manage your purchase orders"
        action={can('purchases:create') ? 'New Purchase' : null}
        onAction={openCreate}
      >
        <ExportButton entity="purchases" />
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
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Supplier</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Payment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {items.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-14 text-center text-gray-400 text-sm">No purchases recorded yet.</td></tr>
              ) : (items || []).map((purchase) => (
                <tr key={purchase.id} className="transition-colors" style={{ }}>
                  <td className="px-5 py-4 font-medium text-primary-600">{purchase.invoice_number}</td>
                  <td className="px-5 py-4 text-gray-700">{purchase.supplier_name || '-'}</td>
                  <td className="px-5 py-4 text-right font-medium">₹{purchase.net_amount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{purchase.payment_status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      purchase.status === 'completed' ? 'bg-green-100 text-green-700' :
                      purchase.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>{purchase.status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{purchase.purchase_date}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(purchase)} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600" title="View Details">
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      {can('purchases:update') && purchase.status !== 'cancelled' && (
                        <button onClick={() => handleCancelPurchase(purchase.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Cancel">
                          <HiOutlineXCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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

      {/* Create Purchase Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Purchase">
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <div className="flex items-end gap-2">
                <select value={purchaseForm.supplier_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })} className="input w-full">
                  <option value="">No Supplier</option>
                  {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}{s.company ? ` (${s.company})` : ''}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(true)}
                  className="mb-[2px] p-2.5 rounded-xl text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all border border-primary-200"
                  title="Add new supplier"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={purchaseForm.payment_method} onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value })} className="input w-full">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">Items *</label>
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="p-1.5 rounded-xl text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all border border-primary-200"
                title="Add new product"
              >
                <HiOutlinePlus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={item.product_id} onChange={(e) => handleProductChange(idx, e.target.value)} className="input flex-1 text-sm">
                    <option value="">Select Product</option>
                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.purchase_price})</option>)}
                  </select>
                  <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="input w-24 text-sm" placeholder="Qty" />
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} className="input w-20 text-sm" placeholder="Price" />
                  {purchaseItems.length > 1 && (
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
              <input type="number" min="0" step="0.01" value={purchaseForm.discount} onChange={(e) => setPurchaseForm({ ...purchaseForm, discount: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select value={purchaseForm.payment_status} onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_status: e.target.value })} className="input w-full">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid (Credit)</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} className="input w-full" />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
            <span className="font-medium text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-900">₹{getTotal().toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Record Purchase</button>
          </div>
        </form>
      </Modal>

      {/* Purchase Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Purchase - ${purchaseDetail?.invoice_number || ''}`}>
        {purchaseDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{purchaseDetail.purchase_date}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{purchaseDetail.status}</span></div>
              <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{purchaseDetail.payment_method}</span></div>
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{purchaseDetail.supplier_name || '-'}</span></div>
            </div>
            {purchaseDetail.items && purchaseDetail.items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b"><th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th></tr></thead>
                  <tbody>
                    {(purchaseDetail.items || []).map((item, i) => (
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
              <div className="flex justify-between"><span>Subtotal</span><span>₹{purchaseDetail.total_amount}</span></div>
              {parseFloat(purchaseDetail.discount) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-₹{purchaseDetail.discount}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Net Amount</span><span>₹{purchaseDetail.net_amount}</span></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Supplier Modal */}
      <Modal open={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Add New Supplier" size="sm">
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input
              type="text"
              required
              value={newSupplierForm.name}
              onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
              className="input w-full"
              placeholder="e.g. Ravi Traders"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={newSupplierForm.company}
              onChange={(e) => setNewSupplierForm({ ...newSupplierForm, company: e.target.value })}
              className="input w-full"
              placeholder="e.g. ABC Distributors Pvt Ltd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={newSupplierForm.phone}
              onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
              className="input w-full"
              placeholder="e.g. 9876543210"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowSupplierModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={supplierLoading || !newSupplierForm.name.trim()} className="btn-primary text-sm disabled:opacity-50">
              {supplierLoading ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title="Add New Product" size="sm">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={newProductForm.name}
              onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
              className="input w-full"
              placeholder="e.g. Tata Salt 1kg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newProductForm.purchase_price}
                onChange={(e) => setNewProductForm({ ...newProductForm, purchase_price: e.target.value })}
                className="input w-full"
                placeholder="₹ Cost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newProductForm.selling_price}
                onChange={(e) => setNewProductForm({ ...newProductForm, selling_price: e.target.value })}
                className="input w-full"
                placeholder="₹ Sell"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={newProductForm.unit}
              onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
              className="input w-full"
            >
              <option value="piece">Piece</option>
              <option value="kg">Kg</option>
              <option value="gram">Gram</option>
              <option value="litre">Litre</option>
              <option value="ml">ml</option>
              <option value="meter">Meter</option>
              <option value="box">Box</option>
              <option value="dozen">Dozen</option>
              <option value="packet">Packet</option>
              <option value="bottle">Bottle</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowProductModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={productLoading || !newProductForm.name.trim() || !newProductForm.purchase_price || !newProductForm.selling_price} className="btn-primary text-sm disabled:opacity-50">
              {productLoading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
