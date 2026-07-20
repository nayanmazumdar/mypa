import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineCube, HiOutlinePhoto } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../store/productSlice';
import {
  PageHeader, SearchInput, DataTable, ActionButton, ActionGroup,
  Modal, FormField, FormRow, FormSection, Avatar, EmptyState,
  PageError, LoadingSpinner, ExportButton,
} from '../components/common';
import api from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

const INITIAL_FORM = {
  name: '', description: '', brand: '', sku: '', barcode: '', hsn_code: '',
  purchase_price: '', selling_price: '', mrp: '', unit: 'piece', weight: '',
  tax_rate: '0', category_id: '', min_stock_level: '', max_stock_level: '',
  expiry_date: '', image_url: '', is_featured: false,
};

const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' }, { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' }, { value: 'litre', label: 'Litre' },
  { value: 'ml', label: 'ml' }, { value: 'meter', label: 'Meter' },
  { value: 'box', label: 'Box' }, { value: 'dozen', label: 'Dozen' },
  { value: 'packet', label: 'Packet' }, { value: 'bottle', label: 'Bottle' },
];

export default function Products() {
  usePageTitle('Products');
  const dispatch = useDispatch();
  const { items, pagination, loading, error } = useSelector((state) => state.products);
  const { can, role } = usePermission();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 20, search }));
  }, [dispatch, search, page]);

  useEffect(() => {
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
        dispatch(fetchProducts({ page, limit: 20, search }));
      } else toast.error(result.payload?.message || 'Failed to update');
    } else {
      result = await dispatch(createProduct(payload));
      if (createProduct.fulfilled.match(result)) {
        toast.success('Product created');
        setShowModal(false);
        setForm(INITIAL_FORM);
      } else toast.error(result.payload?.message || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const result = await dispatch(deleteProduct(id));
    if (deleteProduct.fulfilled.match(result)) toast.success('Product deleted');
    else toast.error(result.payload?.message || 'Cannot delete — may be in use');
  };

  const updateForm = (key, val) => setForm({ ...form, [key]: val });

  const categoryOptions = [{ value: '', label: 'None' }, ...categories.map(c => ({ value: c.id, label: c.name }))];

  if (loading && items.length === 0) return <LoadingSpinner />;

  const columns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU', hideOn: 'sm' },
    { key: 'unit', label: 'Unit', hideOn: 'md' },
    ...(role !== 'staff' ? [{ key: 'cost', label: 'Cost', align: 'right', hideOn: 'lg' }] : []),
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'mrp', label: 'MRP', align: 'right', hideOn: 'lg' },
    { key: 'actions', label: '', align: 'center' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        subtitle={`${pagination?.total || 0} items in catalog`}
        action={can('products:create') ? 'Add Product' : null}
        onAction={openCreate}
      >
        <ExportButton entity="products" canImport />
      </PageHeader>

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by name, SKU, barcode, or brand..."
      />

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {items.length === 0 ? (
          <EmptyState icon={HiOutlineCube} title="No products yet" message={role === 'staff' ? 'Contact admin to add products.' : 'Add your first product to get started.'} actionLabel={can('products:create') ? 'Add Product' : null} onAction={openCreate} />
        ) : items.map((product) => (
          <div key={product.id} className="card p-4 flex items-center gap-4">
            <Avatar name={product.name} src={product.image_url} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{product.brand || product.sku || product.unit}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">₹{product.selling_price}</p>
              {role !== 'staff' && <p className="text-[11px] text-gray-400">Cost: ₹{product.purchase_price}</p>}
            </div>
            <ActionGroup>
              {can('products:update') && <ActionButton variant="edit" onClick={() => openEdit(product)} title="Edit" />}
              {can('products:delete') && <ActionButton variant="delete" onClick={() => handleDelete(product.id)} title="Delete" />}
            </ActionGroup>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={items}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
          emptyState={<EmptyState icon={HiOutlineCube} title="No products yet" message={role === 'staff' ? 'Contact admin to add products.' : 'Add your first product to get started.'} actionLabel={can('products:create') ? 'Add Product' : null} onAction={openCreate} />}
          renderRow={(product) => (
            <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={product.name} src={product.image_url} />
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 hidden sm:table-cell">
                <p className="text-gray-600 font-mono text-xs">{product.sku || '—'}</p>
              </td>
              <td className="px-5 py-4 text-gray-500 capitalize hidden md:table-cell">{product.unit}</td>
              {role !== 'staff' && <td className="px-5 py-4 text-right text-gray-500 hidden lg:table-cell">₹{product.purchase_price}</td>}
              <td className="px-5 py-4 text-right font-semibold text-gray-900">₹{product.selling_price}</td>
              <td className="px-5 py-4 text-right text-gray-400 hidden lg:table-cell">₹{product.mrp || product.selling_price}</td>
              <td className="px-5 py-4">
                <ActionGroup>
                  {can('products:update') && <ActionButton variant="edit" onClick={() => openEdit(product)} title="Edit" />}
                  {can('products:delete') && <ActionButton variant="delete" onClick={() => handleDelete(product.id)} title="Delete" />}
                </ActionGroup>
              </td>
            </tr>
          )}
        />
      </div>

      {/* Add/Edit Product Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Product' : 'Add New Product'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image */}
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-gray-100" onError={() => setImagePreview('')} />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
                <HiOutlinePhoto className="w-7 h-7 text-gray-300" />
              </div>
            )}
            <div className="flex-1">
              <FormField label="Image URL" type="url" value={form.image_url} onChange={(v) => { updateForm('image_url', v); setImagePreview(v); }} placeholder="https://..." />
            </div>
          </div>

          <FormField label="Product Name" required value={form.name} onChange={(v) => updateForm('name', v)} placeholder="e.g. Tata Salt 1kg" />
          <FormField label="Description" type="textarea" rows={2} value={form.description} onChange={(v) => updateForm('description', v)} placeholder="Optional product description" />

          <FormRow>
            <FormField label="Brand" value={form.brand} onChange={(v) => updateForm('brand', v)} placeholder="e.g. Amul, Tata" />
            <FormField label="Category" type="select" value={form.category_id} onChange={(v) => updateForm('category_id', v)} options={categoryOptions} />
          </FormRow>

          <FormSection title="Pricing">
            <FormRow cols={3}>
              <FormField label="Cost Price" type="number" step="0.01" required value={form.purchase_price} onChange={(v) => updateForm('purchase_price', v)} placeholder="₹" />
              <FormField label="Sell Price" type="number" step="0.01" required value={form.selling_price} onChange={(v) => updateForm('selling_price', v)} placeholder="₹" />
              <FormField label="MRP" type="number" step="0.01" value={form.mrp} onChange={(v) => updateForm('mrp', v)} placeholder="₹" />
            </FormRow>
          </FormSection>

          <FormRow cols={3}>
            <FormField label="Unit" type="select" value={form.unit} onChange={(v) => updateForm('unit', v)} options={UNIT_OPTIONS} />
            <FormField label="SKU" value={form.sku} onChange={(v) => updateForm('sku', v)} placeholder="Auto or manual" />
            <FormField label="Barcode" value={form.barcode} onChange={(v) => updateForm('barcode', v)} placeholder="Scan or type" />
          </FormRow>

          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-primary-600 hover:text-primary-700 font-semibold uppercase tracking-wide">
            {showAdvanced ? '▾ Hide' : '▸ Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <FormRow>
                <FormField label="Weight / Size" value={form.weight} onChange={(v) => updateForm('weight', v)} placeholder="e.g. 500g, 1L" />
                <FormField label="HSN Code" value={form.hsn_code} onChange={(v) => updateForm('hsn_code', v)} placeholder="GST HSN/SAC" />
              </FormRow>
              <FormRow>
                <FormField label="Tax Rate (%)" type="number" step="0.01" value={form.tax_rate} onChange={(v) => updateForm('tax_rate', v)} />
                <FormField label="Expiry Date" type="date" value={form.expiry_date} onChange={(v) => updateForm('expiry_date', v)} />
              </FormRow>
              <FormRow>
                <FormField label="Min Stock Level" type="number" value={form.min_stock_level} onChange={(v) => updateForm('min_stock_level', v)} placeholder="Reorder point" />
                <FormField label="Max Stock Level" type="number" value={form.max_stock_level} onChange={(v) => updateForm('max_stock_level', v)} placeholder="Max capacity" />
              </FormRow>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => updateForm('is_featured', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Featured item (show in POS quick list)</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">{editingId ? 'Save Changes' : 'Create Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
