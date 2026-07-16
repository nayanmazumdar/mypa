import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineGift, HiOutlinePencil } from 'react-icons/hi2';
import api from '../api/axios';
import { PageHeader, Modal, LoadingSpinner, Pagination, FormField, FormRow, FeatureGate } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSubscription } from '../hooks/useSubscription';

export default function Offers() {
  usePageTitle('Offers & Discounts');
  const { hasFeature } = useSubscription();

  if (!hasFeature('offers')) {
    return <FeatureGate feature="offers" available={false} />;
  }

  return <OffersContent />;
}

function OffersContent() {
  const [offers, setOffers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', discount_type: 'percentage', discount_value: '',
    min_purchase_amount: '', max_discount_amount: '', applicable_to: 'all',
    category_id: '', product_id: '', start_date: '', end_date: '', is_active: true,
  });

  useEffect(() => { loadOffers(); loadMeta(); }, [page]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/offers', { params: { limit: 20, page } });
      setOffers(res.data || []);
      setPagination(res.pagination || null);
    } catch {} finally { setLoading(false); }
  };

  const loadMeta = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products', { params: { limit: 200 } }),
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch {}
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase_amount: '', max_discount_amount: '', applicable_to: 'all', category_id: '', product_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      name: offer.name, description: offer.description || '', discount_type: offer.discount_type,
      discount_value: offer.discount_value, min_purchase_amount: offer.min_purchase_amount || '',
      max_discount_amount: offer.max_discount_amount || '', applicable_to: offer.applicable_to,
      category_id: offer.category_id || '', product_id: offer.product_id || '',
      start_date: offer.start_date?.split('T')[0] || '', end_date: offer.end_date?.split('T')[0] || '',
      is_active: offer.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, discount_value: parseFloat(form.discount_value), min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : 0, max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null, category_id: form.category_id ? parseInt(form.category_id) : null, product_id: form.product_id ? parseInt(form.product_id) : null };
    try {
      if (editingId) {
        await api.put(`/offers/${editingId}`, payload);
        toast.success('Offer updated');
      } else {
        await api.post('/offers', payload);
        toast.success('Offer created');
      }
      setShowModal(false);
      loadOffers();
    } catch (err) { toast.error(err.structured?.message || 'Failed to save offer'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try { await api.delete(`/offers/${id}`); toast.success('Offer deleted'); loadOffers(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (offer) => {
    try { await api.put(`/offers/${offer.id}`, { ...offer, is_active: !offer.is_active }); loadOffers(); }
    catch { toast.error('Failed to update'); }
  };

  const isActive = (offer) => {
    const today = new Date().toISOString().split('T')[0];
    return offer.is_active && offer.start_date <= today && offer.end_date >= today;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Offers & Discounts"
        subtitle="Manage promotions for your shop"
        action="New Offer"
        onAction={openCreate}
      />

      {offers.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineGift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No offers yet</h3>
          <p className="text-gray-500 mb-4">Create your first offer to attract customers</p>
          <button onClick={openCreate} className="btn-primary">Create Offer</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className={`card relative ${!isActive(offer) ? 'opacity-60' : ''}`}>
              {isActive(offer) && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-500 rounded-full"></span>}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{offer.name}</h3>
                  {offer.description && <p className="text-xs text-gray-500 mt-0.5">{offer.description}</p>}
                </div>
              </div>
              <div className="rounded-xl p-3 mb-3 text-center" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
                <span className="text-2xl font-bold text-primary-700">
                  {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`}
                </span>
                <span className="text-sm text-primary-600 ml-1">OFF</span>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <p>Applies to: <span className="font-medium text-gray-700 capitalize">{offer.applicable_to}{offer.category_name ? ` (${offer.category_name})` : ''}{offer.product_name ? ` (${offer.product_name})` : ''}</span></p>
                <p>Valid: {offer.start_date?.split('T')[0]} to {offer.end_date?.split('T')[0]}</p>
                {offer.min_purchase_amount > 0 && <p>Min purchase: ₹{offer.min_purchase_amount}</p>}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => handleToggle(offer)} className={`text-xs px-2 py-1 rounded ${offer.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                  {offer.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => openEdit(offer)} className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100"><HiOutlinePencil className="w-3.5 h-3.5 inline" /> Edit</button>
                <button onClick={() => handleDelete(offer.id)} className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 ml-auto"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && <Pagination pagination={pagination} page={page} onPageChange={setPage} />}

      {/* Create/Edit Offer Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Offer' : 'Create New Offer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offer Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Summer Sale 20% Off" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="input-field">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
              <input type="number" step="0.01" required value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="input-field" placeholder={form.discount_type === 'percentage' ? '10' : '50'} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
            <select value={form.applicable_to} onChange={(e) => setForm({ ...form, applicable_to: e.target.value, category_id: '', product_id: '' })} className="input-field">
              <option value="all">All Products</option>
              <option value="category">Specific Category</option>
              <option value="product">Specific Product</option>
            </select>
          </div>
          {form.applicable_to === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {form.applicable_to === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input-field">
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (₹)</label>
              <input type="number" step="0.01" value={form.min_purchase_amount} onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
              <input type="number" step="0.01" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="input-field" placeholder="No limit" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Offer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
