import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCube, HiOutlinePhoto } from 'react-icons/hi2';
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 20, search }));
  }, [dispatch, search]);

  useEffect(() => {
    // Load categories for dropdown
    api.get('/categories').then(res => setCategories(res.data || [])).catch(() => {});
  }, []);

  if (error && items.length === 0 && !loading) {
    return <PageError error={error} onRetry={() => dispatch(fetchProducts({ page: 1, limit: 20 }))} />;
  }

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
        toast.error(result.payload?.message || 'Failed to create');
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

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">{pagination?.total || 0} items in catalog</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Product
        </button>
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
                  <td colSpan="7">
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

      {/* Add/Edit Product Modal */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
    </div>
  );
}
