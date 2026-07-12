import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlinePlus, HiOutlineMinus, HiOutlineMagnifyingGlass,
  HiOutlineExclamationTriangle, HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath, HiOutlineClock,
  HiOutlineFunnel, HiOutlineArrowsUpDown,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchInventory, fetchLowStock } from '../store/inventorySlice';
import { inventoryApi } from '../api/inventory.api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/DataTable';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Inventory() {
  usePageTitle('Inventory');
  const dispatch = useDispatch();
  const { items, lowStock, pagination, loading } = useSelector((state) => state.inventory);
  const { can } = usePermission();

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all'); // all | low | out
  const [sortBy, setSortBy] = useState('name'); // name | quantity | status
  const [sortDir, setSortDir] = useState('asc');
  const limit = 20;

  // Modals
  const [showStockModal, setShowStockModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Forms
  const [stockForm, setStockForm] = useState({ product_id: '', product_name: '', quantity: '', type: 'in', notes: '' });
  const [settingsForm, setSettingsForm] = useState({ product_id: '', product_name: '', min_stock_level: '', max_stock_level: '', location: '' });

  // History
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyProduct, setHistoryProduct] = useState('');

  // ─── Data Loading ─────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchInventory({ page, limit, search }));
    dispatch(fetchLowStock());
  }, [dispatch, page, search]);

  const refresh = useCallback(() => {
    dispatch(fetchInventory({ page, limit, search }));
    dispatch(fetchLowStock());
  }, [dispatch, page, limit, search]);

  // ─── Sorting & Filtering ─────────────────────────────────────
  const getFilteredItems = () => {
    let data = filter === 'low'
      ? items.filter(i => parseFloat(i.quantity) > 0 && parseFloat(i.quantity) <= parseFloat(i.min_stock_level))
      : filter === 'out'
      ? items.filter(i => parseFloat(i.quantity) <= 0)
      : items;

    // Sort
    data = [...data].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.product_name || '').localeCompare(b.product_name || '');
      else if (sortBy === 'quantity') cmp = parseFloat(a.quantity) - parseFloat(b.quantity);
      else if (sortBy === 'status') {
        const statusA = parseFloat(a.quantity) <= 0 ? 0 : parseFloat(a.quantity) <= parseFloat(a.min_stock_level) ? 1 : 2;
        const statusB = parseFloat(b.quantity) <= 0 ? 0 : parseFloat(b.quantity) <= parseFloat(b.min_stock_level) ? 1 : 2;
        cmp = statusA - statusB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // ─── Stock Adjustment ─────────────────────────────────────────
  const openStockModal = (item, type) => {
    setStockForm({ product_id: item.product_id, product_name: item.product_name, quantity: '', type, notes: '' });
    setShowStockModal(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(stockForm.quantity);
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return; }
    try {
      await inventoryApi.addStock({
        product_id: stockForm.product_id,
        quantity: qty,
        type: stockForm.type,
        notes: stockForm.notes || null,
      });
      toast.success(`Stock ${stockForm.type === 'in' ? 'added' : stockForm.type === 'out' ? 'removed' : 'adjusted'} successfully`);
      setShowStockModal(false);
      refresh();
    } catch {
      toast.error('Failed to update stock');
    }
  };

  // ─── Settings (Min/Max/Location) ──────────────────────────────
  const openSettingsModal = (item) => {
    setSettingsForm({
      product_id: item.product_id,
      product_name: item.product_name,
      min_stock_level: item.min_stock_level || '',
      max_stock_level: item.max_stock_level || '',
      location: item.location || '',
    });
    setShowSettingsModal(true);
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.updateSettings(settingsForm.product_id, {
        min_stock_level: parseFloat(settingsForm.min_stock_level) || 0,
        max_stock_level: parseFloat(settingsForm.max_stock_level) || 0,
        location: settingsForm.location || null,
      });
      toast.success('Inventory settings updated');
      setShowSettingsModal(false);
      refresh();
    } catch {
      toast.error('Failed to update settings');
    }
  };

  // ─── Stock History ────────────────────────────────────────────
  const openHistoryModal = async (item) => {
    setHistoryProduct(item.product_name);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await inventoryApi.getHistory(item.product_id);
      setHistoryData(res.data || []);
    } catch {
      toast.error('Failed to load history');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const getStatus = (item) => {
    const qty = parseFloat(item.quantity);
    const min = parseFloat(item.min_stock_level);
    if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (qty <= min) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const displayItems = getFilteredItems();
  const outOfStockCount = items.filter(i => parseFloat(i.quantity) <= 0).length;

  if (loading && items.length === 0) return <LoadingSpinner />;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Monitor stock levels, adjust quantities, and track movements</p>
        </div>
        <div className="flex items-center gap-2">
          {lowStock.length > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-yellow-200">
              <HiOutlineExclamationTriangle className="w-4 h-4" />
              {lowStock.length} low stock
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200">
              <HiOutlineExclamationTriangle className="w-4 h-4" />
              {outOfStockCount} out of stock
            </div>
          )}
          <button onClick={refresh} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Refresh">
            <HiOutlineArrowPath className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{pagination?.total || items.length}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">In Stock</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{items.filter(i => parseFloat(i.quantity) > parseFloat(i.min_stock_level)).length}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Low Stock</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{lowStock.length}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => { setFilter('all'); setPage(1); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'text-primary-700' : 'text-gray-500'}`}>
            All
          </button>
          <button onClick={() => { setFilter('low'); setPage(1); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'low' ? 'text-amber-600' : 'text-gray-500'}`}>
            Low ({lowStock.length})
          </button>
          <button onClick={() => { setFilter('out'); setPage(1); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'out' ? 'text-red-600' : 'text-gray-500'}`}>
            Out ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "rgba(200,207,216,0.2)" }}>
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900">
                    Product {sortBy === 'name' && <HiOutlineArrowsUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">SKU / Barcode</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => toggleSort('quantity')} className="flex items-center gap-1 ml-auto hover:text-gray-900">
                    Stock {sortBy === 'quantity' && <HiOutlineArrowsUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Min Level</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Max Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                    Status {sortBy === 'status' && <HiOutlineArrowsUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                    {search ? `No items matching "${search}"` : filter === 'low' ? 'No low stock items' : filter === 'out' ? 'No out-of-stock items' : 'No inventory data yet'}
                  </td>
                </tr>
              ) : displayItems.map((item) => {
                const status = getStatus(item);
                const qty = parseFloat(item.quantity);
                const min = parseFloat(item.min_stock_level);
                const max = parseFloat(item.max_stock_level) || 100;
                const fillPercent = max > 0 ? Math.min(100, Math.max(0, (qty / max) * 100)) : 0;

                return (
                  <tr key={item.id || item.product_id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      <span className="font-mono text-xs">{item.sku || item.barcode || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${qty <= 0 ? 'bg-red-500' : qty <= min ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                        <span className={`font-bold ${qty <= 0 ? 'text-red-600' : qty <= min ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {qty % 1 === 0 ? Math.round(qty) : qty.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">{item.min_stock_level || 0}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">{item.max_stock_level || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">{item.location || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {can('inventory:adjust') && (
                          <>
                            <button onClick={() => openStockModal(item, 'in')} className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-colors" title="Add Stock">
                              <HiOutlinePlus className="w-4 h-4" />
                            </button>
                            <button onClick={() => openStockModal(item, 'out')} className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors" title="Remove Stock">
                              <HiOutlineMinus className="w-4 h-4" />
                            </button>
                            <button onClick={() => openSettingsModal(item)} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors" title="Stock Settings">
                              <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => openHistoryModal(item)} className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600 transition-colors" title="Stock History">
                          <HiOutlineClock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        )}
      </div>

      {/* ─── Stock Adjustment Modal ──────────────────────────────── */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title={`${stockForm.type === 'in' ? 'Add' : stockForm.type === 'out' ? 'Remove' : 'Adjust'} Stock`}>
        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-medium">Product</p>
            <p className="font-semibold text-gray-900 mt-0.5">{stockForm.product_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'in', label: 'Stock In', color: 'green' },
                { id: 'out', label: 'Stock Out', color: 'red' },
                { id: 'adjustment', label: 'Correction', color: 'blue' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStockForm({ ...stockForm, type: t.id })}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                    stockForm.type === t.id
                      ? `bg-${t.color}-50 border-${t.color}-300 text-${t.color}-700`
                      : 'text-gray-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" step="0.01" min="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className="input w-full" placeholder="Enter quantity" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
            <textarea rows={2} value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} className="input w-full" placeholder="e.g. Received from supplier, damaged goods..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowStockModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">
              {stockForm.type === 'in' ? '+ Add Stock' : stockForm.type === 'out' ? '- Remove Stock' : 'Adjust'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Settings Modal (Min/Max/Location) ───────────────────── */}
      <Modal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Stock Settings">
        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-medium">Product</p>
            <p className="font-semibold text-gray-900 mt-0.5">{settingsForm.product_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input type="number" step="0.01" min="0" value={settingsForm.min_stock_level} onChange={(e) => setSettingsForm({ ...settingsForm, min_stock_level: e.target.value })} className="input w-full" placeholder="0" />
              <p className="text-xs text-gray-400 mt-1">Alert when stock falls below this</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
              <input type="number" step="0.01" min="0" value={settingsForm.max_stock_level} onChange={(e) => setSettingsForm({ ...settingsForm, max_stock_level: e.target.value })} className="input w-full" placeholder="0" />
              <p className="text-xs text-gray-400 mt-1">Maximum storage capacity</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
            <input type="text" value={settingsForm.location} onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })} className="input w-full" placeholder="e.g. Rack A, Shelf 2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowSettingsModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Settings</button>
          </div>
        </form>
      </Modal>

      {/* ─── Stock History Modal ──────────────────────────────────── */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`Stock History — ${historyProduct}`}>
        <div className="space-y-3">
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No stock movements recorded yet</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {historyData.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    m.type === 'in' ? 'bg-green-100 text-green-600' : m.type === 'out' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {m.type === 'in' ? <HiOutlinePlus className="w-4 h-4" /> : m.type === 'out' ? <HiOutlineMinus className="w-4 h-4" /> : <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${m.type === 'in' ? 'text-green-700' : m.type === 'out' ? 'text-red-700' : 'text-blue-700'}`}>
                        {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'}{parseFloat(m.quantity)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {m.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{m.notes}</p>}
                    {m.reference_type && <p className="text-xs text-gray-400 mt-0.5">Ref: {m.reference_type}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
