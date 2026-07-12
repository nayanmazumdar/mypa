import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineGift, HiOutlinePencil } from 'react-icons/hi2';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Returns today's date as YYYY-MM-DD in LOCAL time — avoids UTC off-by-one in IST/UTC+ zones
const localDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Offers() {
  const [offers, setOffers] = useState([]);
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

  useEffect(() => { loadOffers(); loadMeta(); }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/offers', { params: { limit: 50 } });
      setOffers(res.data || []);
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
    setForm({
      name: '', description: '',
      discount_type: 'percentage',   // default to %
      discount_value: '',
      min_purchase_amount: '', max_discount_amount: '',
      applicable_to: 'category',     // default to category
      category_id: '', product_id: '',
      start_date: localDateStr(), end_date: '', is_active: true,
    });
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
    // Only allow toggling offers within their valid date range
    // Expired and scheduled offers are date-controlled — toggle is blocked
    const today = localDateStr();
    const expired = offer.end_date?.split('T')[0] < today;
    const scheduled = offer.start_date?.split('T')[0] > today;
    if (expired || scheduled) return;

    const nowActive = !offer.is_active;
    try {
      await api.patch(`/offers/${offer.id}/toggle`, { is_active: nowActive });
      toast.success(nowActive ? `"${offer.name}" resumed` : `"${offer.name}" paused`);
      loadOffers();
    } catch { toast.error('Failed to update offer'); }
  };

  const isActive = (offer) => {
    const today = localDateStr();
    return offer.is_active && offer.start_date <= today && offer.end_date >= today;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offers & Discounts</h1>
          <p className="text-gray-500">Manage promotions for your shop</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> New Offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineGift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No offers yet</h3>
          <p className="text-gray-500 mb-4">Create your first offer to attract customers</p>
          <button onClick={openCreate} className="btn-primary">Create Offer</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const live = isActive(offer);
            const today = localDateStr();
            const expired = offer.end_date?.split('T')[0] < today;
            const scheduled = offer.start_date?.split('T')[0] > today;
            return (
              <div key={offer.id} className={`card relative flex flex-col transition-all ${
                live ? 'border-green-300 shadow-green-100 shadow-sm' : 'border-gray-200'
              }`}>
                {/* Header row: name + toggle switch */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-semibold text-gray-900 truncate">{offer.name}</h3>
                    {offer.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{offer.description}</p>
                    )}
                  </div>
                  {/* Toggle switch — date-driven; only live offers can be manually paused */}
                  <button
                    onClick={() => handleToggle(offer)}
                    disabled={expired || scheduled}
                    title={
                      expired   ? 'Expired — edit date range to re-activate' :
                      scheduled ? 'Scheduled — will auto-activate on start date' :
                      offer.is_active ? 'Click to pause' : 'Click to activate'
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                      expired || scheduled
                        ? 'bg-gray-200 cursor-not-allowed'
                        : offer.is_active
                          ? 'bg-green-500 cursor-pointer'
                          : 'bg-gray-300 cursor-pointer'
                    }`}
                    role="switch"
                    aria-checked={!expired && !scheduled && offer.is_active}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !expired && !scheduled && offer.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Status badge */}
                <div className="mb-3">
                  {live ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Live on POS
                    </span>
                  ) : expired ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Expired
                    </span>
                  ) : scheduled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                      Scheduled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Discount badge */}
                <div className={`rounded-lg p-3 mb-3 text-center ${live ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className={`text-2xl font-bold ${live ? 'text-green-700' : 'text-gray-400'}`}>
                    {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`}
                  </span>
                  <span className={`text-sm ml-1 ${live ? 'text-green-600' : 'text-gray-400'}`}>OFF</span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs text-gray-500 flex-1">
                  <p>Applies to: <span className="font-medium text-gray-700 capitalize">
                    {offer.applicable_to}
                    {offer.category_name ? ` — ${offer.category_name}` : ''}
                    {offer.product_name  ? ` — ${offer.product_name}`  : ''}
                  </span></p>
                  <p>Valid: <span className="font-medium text-gray-700">
                    {offer.start_date?.split('T')[0]} → {offer.end_date?.split('T')[0]}
                  </span></p>
                  {offer.min_purchase_amount > 0 && (
                    <p>Min purchase: ₹{offer.min_purchase_amount}</p>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(offer)}
                    className="text-xs px-2.5 py-1 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                  >
                    <HiOutlinePencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="text-xs px-2.5 py-1 rounded-lg text-red-500 hover:bg-red-50 ml-auto"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Offer Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Offer' : 'Create New Offer'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Offer name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offer Name *</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="e.g. Summer Sale 20% Off" />
          </div>

          {/* Applies To — category first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
            <select value={form.applicable_to}
              onChange={(e) => setForm({ ...form, applicable_to: e.target.value, category_id: '', product_id: '' })}
              className="input-field">
              <option value="category">Specific Category</option>
              <option value="all">All Products</option>
              <option value="product">Specific Product</option>
            </select>
          </div>

          {/* Category selector */}
          {form.applicable_to === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              {categories.length === 0 ? (
                <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  No categories found. Add categories from the Products page first.
                </p>
              ) : (
                <select required value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input-field">
                  <option value="">— Select a category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Product selector */}
          {form.applicable_to === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select required value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="input-field">
                <option value="">— Select a product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>
                ))}
              </select>
            </div>
          )}

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value, discount_value: '' })}
                className="input-field">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount'} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0.01"
                  max={form.discount_type === 'percentage' ? 100 : undefined}
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="input-field pr-10"
                  placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none">
                  {form.discount_type === 'percentage' ? '%' : '₹'}
                </span>
              </div>
              {form.discount_type === 'percentage' && parseFloat(form.discount_value) > 100 && (
                <p className="text-xs text-red-500 mt-1">Percentage cannot exceed 100%</p>
              )}
            </div>
          </div>

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" required value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" required value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input-field" />
            </div>
          </div>

          {/* Optional description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="Short note visible on receipt" />
          </div>

          {/* Optional limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (₹) <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="number" step="0.01" min="0" value={form.min_purchase_amount}
                onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹) <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="number" step="0.01" min="0" value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                className="input-field" placeholder="No limit" />
            </div>
          </div>

          {/* Date-driven activation note */}
          <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50">
            <span className="text-blue-500 mt-0.5 shrink-0">ℹ</span>
            <p className="text-xs text-blue-700">
              This offer activates and deactivates automatically based on the date range above.
              {editingId ? ' Saving with a valid date range will re-enable it.' : ''}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={form.discount_type === 'percentage' && parseFloat(form.discount_value) > 100}
              className="btn-primary disabled:opacity-50"
            >
              {editingId ? 'Save Changes' : 'Create Offer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
