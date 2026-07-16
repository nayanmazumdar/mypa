import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowPath, HiOutlineTrash, HiOutlineCheck,
  HiOutlineExclamationTriangle, HiOutlineClock, HiOutlineSignal,
} from 'react-icons/hi2';
import { getAllSyncItems, retrySyncItem, deleteSyncItem } from '../utils/offlineDb';
import { syncPendingTransactions } from '../utils/syncService';
import { useNetwork } from '../hooks/useNetwork';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100', icon: HiOutlineClock },
  synced: { label: 'Synced', color: 'text-green-600', bg: 'bg-green-100', icon: HiOutlineCheck },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-100', icon: HiOutlineExclamationTriangle },
};

export default function SyncStatus() {
  usePageTitle('Sync Status');
  const { isOnline, isSyncing, triggerSync } = useNetwork();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    const all = await getAllSyncItems();
    setItems(all);
    setLoading(false);
  };

  const handleRetry = async (id) => {
    await retrySyncItem(id);
    toast.success('Marked for retry');
    loadItems();
  };

  const handleRetryAll = async () => {
    const failed = items.filter(i => i.status === 'failed');
    for (const item of failed) {
      await retrySyncItem(item.id);
    }
    toast.success(`${failed.length} items marked for retry`);
    loadItems();
    if (isOnline) {
      await syncPendingTransactions();
      loadItems();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction permanently? This cannot be undone.')) return;
    await deleteSyncItem(id);
    toast.success('Deleted');
    loadItems();
  };

  const handleSyncNow = async () => {
    await triggerSync();
    loadItems();
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sync Status</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount > 0 ? `${pendingCount} pending` : 'All caught up'}
            {failedCount > 0 ? ` • ${failedCount} failed` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {failedCount > 0 && (
            <button onClick={handleRetryAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-amber-700 transition-all"
              style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
              <HiOutlineArrowPath className="w-3.5 h-3.5" /> Retry All Failed
            </button>
          )}
          <button onClick={handleSyncNow} disabled={!isOnline || isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
            <HiOutlineSignal className="w-3.5 h-3.5" /> {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-3xl" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
          <HiOutlineCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">All synced!</p>
          <p className="text-sm text-gray-400 mt-1">No offline transactions in queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const payload = item.payload || {};
            const itemCount = payload.items?.length || 0;
            const total = payload.items?.reduce((s, i) => s + (i.quantity * i.unit_price), 0) || 0;
            return (
              <div key={item.id} className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {payload.customer_name || 'Walk-in'} — {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </p>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ₹{total.toFixed(0)} • {payload.payment_method || 'cash'} • {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {item.last_error && (
                    <p className="text-xs text-red-500 mt-1">Error: {item.last_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === 'failed' && (
                    <button onClick={() => handleRetry(item.id)} title="Retry"
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors">
                      <HiOutlineArrowPath className="w-4 h-4" />
                    </button>
                  )}
                  {item.status !== 'pending' && (
                    <button onClick={() => handleDelete(item.id)} title="Delete"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
