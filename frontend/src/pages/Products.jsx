import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCube, HiOutlinePhoto, HiOutlineTag, HiOutlineXMark, HiOutlinePrinter } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../store/productSlice';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageError, EmptyState } from '../components/common/ErrorDisplay';
import api from '../api/axios';

const INITIAL_FORM = {
  name: '', description: '', brand: '', sku: '', barcode: '', hsn_code: '',
  purchase_price: '', selling_price: '', mrp: '', unit: 'piece', weight: '',
  tax_rate: '0', category_id: '', min_stock_level: '', max_stock_level: '',
  expiry_date: '', image_url: '', is_featured: false,
};

export default function Products() {
  const dispatch = useDispatch();
  const { items, pagination, loading, error } = useSelector((state) => state.products);
  const user = useSelector((state) => state.auth?.user);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState('');

  // Category management state
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [editingCat, setEditingCat] = useState(null); // { id, name }

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 20, search }));
  }, [dispatch, search]);

  const loadCategories = useCallback(() => {
    api.get('/categories')
      .then(res => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  if (error && items.length === 0 && !loading) {
    return <PageError error={error} onRetry={() => dispatch(fetchProducts({ page: 1, limit: 20 }))} />;
  }

  // ── Product handlers ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setImagePreview('');
    setShowAdvanced(false);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '', description: product.description || '',
      brand: product.brand || '', sku: product.sku || '', barcode: product.barcode || '',
      hsn_code: product.hsn_code || '', purchase_price: product.purchase_price || '',
      selling_price: product.selling_price || '', mrp: product.mrp || '',
      unit: product.unit || 'piece', weight: product.weight || '',
      tax_rate: product.tax_rate || '0', category_id: product.category_id || '',
      min_stock_level: product.min_stock_level || '', max_stock_level: product.max_stock_level || '',
      expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
      image_url: product.image_url || '', is_featured: product.is_featured || false,
    });
    setImagePreview(product.image_url || '');
    setShowAdvanced(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      purchase_price: parseFloat(form.purchase_price),
      selling_price: parseFloat(form.selling_price),
      mrp: form.mrp ? parseFloat(form.mrp) : parseFloat(form.selling_price),
      tax_rate: parseFloat(form.tax_rate) || 0,
      min_stock_level: form.min_stock_level ? parseFloat(form.min_stock_level) : 0,
      max_stock_level: form.max_stock_level ? parseFloat(form.max_stock_level) : 0,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      expiry_date: form.expiry_date || null,
      image_url: form.image_url || null,
    };

    let result;
    if (editingId) {
      result = await dispatch(updateProduct({ id: editingId, data: payload }));
      if (updateProduct.fulfilled.match(result)) {
        toast.success('Product updated');
        setShowModal(false);
        dispatch(fetchProducts({ page: 1, limit: 20, search }));
      } else {
        toast.error(result.payload?.message || 'Failed to update');
      }
    } else {
      result = await dispatch(createProduct(payload));
      if (createProduct.fulfilled.match(result)) {
        toast.success('Product created');
        setShowModal(false);
        setForm(INITIAL_FORM);
      } else {
        const msg = result.payload?.message || 'Failed to create product';
        const code = result.payload?.code;
        if (code === 'NO_SHOP_SELECTED') {
          toast.error('No shop active — please select your shop and try again.');
        } else {
          toast.error(msg);
        }
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const result = await dispatch(deleteProduct(id));
    if (deleteProduct.fulfilled.match(result)) {
      toast.success('Product deleted');
    } else {
      toast.error(result.payload?.message || 'Cannot delete — may be in use');
    }
  };

  const handleImageUrl = (e) => {
    const url = e.target.value;
    setForm({ ...form, image_url: url });
    setImagePreview(url);
  };

  // ── Print all products ───────────────────────────────────────────────────

  const printProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 10000, page: 1, search: '' } });
      const allProducts = res.data?.data || res.data || [];

      const shopName  = user?.shop_name || user?.name || 'My Shop';
      const adminName = user?.name || '';
      const logoUrl   = `${window.location.origin}/logo.png`;
      const fmtAmt    = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const now       = new Date().toLocaleString('en-GB');

      // Group products by category (already ordered by category from backend)
      const groups = {};
      const groupOrder = [];
      allProducts.forEach(p => {
        const cat = p.category_name || 'Uncategorised';
        if (!groups[cat]) { groups[cat] = []; groupOrder.push(cat); }
        groups[cat].push(p);
      });

      let rowNum = 0;
      const rows = groupOrder.map(cat => {
        const catRows = groups[cat].map(p => {
          rowNum++;
          const margin = p.purchase_price > 0
            ? (((p.selling_price - p.purchase_price) / p.purchase_price) * 100).toFixed(1)
            : '—';
          return `<tr>
            <td style="color:#9ca3af;font-size:11px;text-align:center">${rowNum}</td>
            <td>
              <div style="font-weight:600;color:#111827">${p.name}</div>
              ${p.brand ? `<div style="font-size:11px;color:#9ca3af">${p.brand}</div>` : ''}
            </td>
            <td style="font-family:monospace;font-size:11px;color:#6b7280">${p.sku || '—'}</td>
            <td style="text-align:center;color:#6b7280">${p.unit}${p.weight ? ` · ${p.weight}` : ''}</td>
            <td style="text-align:right;color:#6b7280">${fmtAmt(p.purchase_price)}</td>
            <td style="text-align:right;font-weight:700;color:#4f46e5">${fmtAmt(p.selling_price)}</td>
            <td style="text-align:right;color:#9ca3af">${p.mrp ? fmtAmt(p.mrp) : '—'}</td>
            <td style="text-align:center;font-size:11px;color:${parseFloat(margin) >= 0 ? '#15803d' : '#dc2626'}">${margin !== '—' ? margin + '%' : '—'}</td>
          </tr>`;
        }).join('');

        return `<tr>
          <td colspan="8" style="background:#f1f5f9;padding:7px 8px;font-size:11px;font-weight:700;color:#4f46e5;letter-spacing:.04em;text-transform:uppercase;border-top:2px solid #e2e8f0">${cat} <span style="font-weight:400;color:#94a3b8">(${groups[cat].length})</span></td>
        </tr>${catRows}`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Product Catalogue — ${shopName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1f2937;padding:24px;max-width:960px;margin:0 auto}

  /* ── Header ── */
  .page-header{border-bottom:3px solid #4f46e5;padding-bottom:14px;margin-bottom:18px}
  .header-top{display:flex;justify-content:space-between;align-items:flex-start}
  .shop-block{}
  .shop-name{font-size:22px;font-weight:900;color:#111827;letter-spacing:-0.5px}
  .shop-tagline{font-size:11px;color:#6b7280;margin-top:2px}
  .doc-block{text-align:right}
  .doc-title{font-size:17px;font-weight:800;color:#4f46e5;letter-spacing:-0.2px}
  .doc-date{font-size:11px;color:#9ca3af;margin-top:4px}
  .header-divider{border:none;border-top:1px solid #e5e7eb;margin:10px 0}
  .count-badge{display:inline-block;background:#ede9fe;color:#4f46e5;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px}

  /* ── Table ── */
  table{width:100%;border-collapse:collapse}
  thead tr{background:#f8fafc}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;padding:8px 8px;border-bottom:2px solid #e5e7eb;white-space:nowrap}
  th.right{text-align:right} th.center{text-align:center}
  td{padding:6px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
  tr:nth-child(even) td{background:#fafafa}

  /* ── Footer ── */
  .page-footer{margin-top:28px;border-top:2px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}
  .footer-brand{display:flex;align-items:center;gap:9px}
  .footer-brand img{height:30px;width:30px;object-fit:contain;border-radius:7px}
  .brand-name{font-size:14px;font-weight:800;color:#7c3aed;letter-spacing:-0.3px}
  .brand-tag{font-size:10px;color:#9b7fd4;margin-top:1px}
  .signatory{text-align:right}
  .sig-line{display:inline-block;width:160px;border-top:1.5px solid #374151;margin-bottom:4px}
  .sig-name{font-size:11px;font-weight:600;color:#374151}
  .sig-role{font-size:10px;color:#9ca3af}

  @media print{body{padding:14px}tr{page-break-inside:avoid}thead{display:table-header-group}}
</style></head><body>

<!-- ── Page Header ── -->
<div class="page-header">
  <div class="header-top">
    <div class="shop-block">
      <div class="shop-name">${shopName}</div>
      <div class="shop-tagline">Product Catalogue</div>
    </div>
    <div class="doc-block">
      <div class="doc-title">Product Catalogue</div>
      <div class="doc-date">Generated: ${now}</div>
    </div>
  </div>
  <hr class="header-divider"/>
  <span class="count-badge">${allProducts.length} product${allProducts.length !== 1 ? 's' : ''} &bull; ${groupOrder.length} categor${groupOrder.length !== 1 ? 'ies' : 'y'}</span>
</div>

<!-- ── Table ── -->
<table>
  <thead>
    <tr>
      <th class="center">#</th>
      <th>Product</th>
      <th>SKU</th>
      <th class="center">Unit</th>
      <th class="right">Cost</th>
      <th class="right">Sell Price</th>
      <th class="right">MRP</th>
      <th class="center">Margin</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<!-- ── Footer ── -->
<div class="page-footer">
  <div class="footer-brand">
    <img src="${logoUrl}" alt="myPA" onerror="this.style.display='none'"/>
    <div>
      <div class="brand-name">myPA</div>
      <div class="brand-tag">Smart Shop Management</div>
    </div>
  </div>
  <div class="signatory">
    <div class="sig-line"></div>
    <div class="sig-name">${adminName || shopName}</div>
    <div class="sig-role">Authorised Signatory</div>
  </div>
</div>

</body></html>`;

      const w = window.open('', '_blank', 'width=1100,height=750');
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    } catch {
      toast.error('Failed to generate product list');
    }
  };

  // ── Category handlers ────────────────────────────────────────────────────

  const openCatModal = () => {
    setNewCatName('');
    setEditingCat(null);
    setShowCatModal(true);
  };

  const startEditCat = (cat) => {
    setEditingCat(cat);
    setNewCatName(cat.name);
  };

  const cancelEditCat = () => {
    setEditingCat(null);
    setNewCatName('');
  };

  const handleSaveCat = async () => {
    const name = newCatName.trim();
    if (!name) { toast.error('Category name is required'); return; }
    setCatLoading(true);
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, { name });
        toast.success('Category updated');
      } else {
        await api.post('/categories', { name });
        toast.success('Category added');
      }
      setNewCatName('');
      setEditingCat(null);
      loadCategories();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save category');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Products in this category will be uncategorised.`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      toast.success('Category deleted');
      // If the deleted category was selected in the product form, clear it
      if (form.category_id === String(cat.id)) setForm(f => ({ ...f, category_id: '' }));
      loadCategories();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to delete category');
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">{pagination?.total || 0} items in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={printProducts} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm font-medium transition-all shadow-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print Catalogue
          </button>
          <button onClick={openCatModal} className="btn-secondary flex items-center gap-2">
            <HiOutlineTag className="w-4 h-4" /> Manage Categories
            {categories.length > 0 && (
              <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{categories.length}</span>
            )}
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="text"
          placeholder="Search by name, SKU, barcode, or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU / Barcode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">MRP</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState icon={HiOutlineCube} title="No products yet" message="Add your first product to get started." actionLabel="Add Product" onAction={openCreate} />
                  </td>
                </tr>
              ) : (
                items.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <HiOutlinePhoto className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.category_name
                        ? <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">{product.category_name}</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-mono text-xs">{product.sku || '-'}</p>
                      {product.barcode && <p className="text-gray-400 font-mono text-xs">{product.barcode}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{product.unit}{product.weight ? ` (${product.weight})` : ''}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{product.purchase_price}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-700">₹{product.selling_price}</td>
                    <td className="px-4 py-3 text-right text-gray-400">₹{product.mrp || product.selling_price}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(product)} className="p-1.5 rounded text-gray-500 hover:text-primary-600 hover:bg-primary-50" aria-label="Edit">
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50" aria-label="Delete">
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
      </div>

      {/* ── Add/Edit Product Modal ─────────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Product' : 'Add New Product'}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Image Preview */}
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" onError={() => setImagePreview('')} />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <HiOutlinePhoto className="w-8 h-8 text-gray-300" />
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input type="url" value={form.image_url} onChange={handleImageUrl} className="input-field text-sm" placeholder="https://..." />
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Optional product description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field" placeholder="e.g. Amul, Tata" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
                <button
                  type="button"
                  onClick={openCatModal}
                  className="ml-2 text-xs text-primary-600 hover:text-primary-700 font-normal"
                >
                  + Manage
                </button>
              </label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No categories yet.{' '}
                  <button type="button" onClick={openCatModal} className="underline hover:no-underline">
                    Create one
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
              <input type="number" step="0.01" required value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price *</label>
              <input type="number" step="0.01" required value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
              <input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="input-field" placeholder="Max retail" />
            </div>
          </div>

          {/* Unit & Identification */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" placeholder="Auto or manual" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input-field" placeholder="Scan or type" />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            {showAdvanced ? '▾ Hide' : '▸ Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight / Size</label>
                  <input type="text" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input-field" placeholder="e.g. 500g, 1L" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input type="text" value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} className="input-field" placeholder="GST HSN/SAC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} className="input-field" placeholder="Reorder point" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                  <input type="number" value={form.max_stock_level} onChange={(e) => setForm({ ...form, max_stock_level: e.target.value })} className="input-field" placeholder="Maximum capacity" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_featured" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <label htmlFor="is_featured" className="text-sm text-gray-700">Featured item (show in POS quick list)</label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Product'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Manage Categories Modal ───────────────────────────────────────── */}
      <Modal open={showCatModal} onClose={() => { setShowCatModal(false); cancelEditCat(); }} title="Manage Categories">
        <div className="space-y-4">
          {/* Add / Edit input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCat()}
              className="input-field flex-1"
              placeholder={editingCat ? 'Edit category name…' : 'New category name…'}
              autoFocus
            />
            {editingCat && (
              <button
                type="button"
                onClick={cancelEditCat}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600"
                aria-label="Cancel edit"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveCat}
              disabled={catLoading || !newCatName.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              {catLoading ? '…' : editingCat ? 'Update' : 'Add'}
            </button>
          </div>

          {/* Category list */}
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <HiOutlineTag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No categories yet. Add one above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {categories.map((cat) => (
                <li key={cat.id} className={`flex items-center justify-between px-3 py-2.5 ${editingCat?.id === cat.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  <span className="text-sm text-gray-800">{cat.name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEditCat(cat)}
                      className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCat(cat)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setShowCatModal(false); cancelEditCat(); }}
              className="btn-secondary"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
