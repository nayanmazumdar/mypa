import { posApi } from '../api/pos.api';
import api from '../api/axios';
import {
  cacheProducts, cacheCustomers, cacheCategories,
  getPendingSyncItems, markSynced, markFailed,
  clearSyncedItems, setMeta, getMeta, getSyncQueueCount,
} from './offlineDb';

let isSyncing = false;
let syncListeners = [];

/**
 * Register a listener for sync status changes.
 * Returns an unsubscribe function.
 */
export function onSyncChange(listener) {
  syncListeners.push(listener);
  return () => { syncListeners = syncListeners.filter(l => l !== listener); };
}

function notifySyncListeners(event) {
  syncListeners.forEach(fn => fn(event));
}

/**
 * Download fresh data from server and cache locally.
 * Called on login, shop selection, and periodically when online.
 */
export async function syncDataFromServer() {
  try {
    const results = await Promise.allSettled([
      fetchAndCacheProducts(),
      fetchAndCacheCustomers(),
      fetchAndCacheCategories(),
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    await setMeta('lastSyncTime', new Date().toISOString());
    notifySyncListeners({ type: 'dataSync', success: successCount, total: 3 });
    return successCount === 3;
  } catch (err) {
    console.warn('[Sync] Data sync failed:', err.message);
    return false;
  }
}

async function fetchAndCacheProducts() {
  // Fetch all products (paginated) and cache them
  let page = 1;
  let allProducts = [];
  let hasMore = true;

  while (hasMore) {
    const response = await posApi.getProducts({ page, limit: 100 });
    const data = response.data || [];
    allProducts = allProducts.concat(data);
    const pagination = response.pagination;
    hasMore = pagination && page < pagination.totalPages;
    page++;
  }

  await cacheProducts(allProducts);
  await setMeta('productsCount', allProducts.length);
}

async function fetchAndCacheCustomers() {
  try {
    const response = await api.get('/customers', { params: { limit: 500 } });
    const data = response.data || [];
    if (Array.isArray(data)) {
      await cacheCustomers(data);
      await setMeta('customersCount', data.length);
    }
  } catch (err) {
    // Log so the failure is visible during debugging; non-fatal for POS
    console.warn('[Sync] Failed to cache customers:', err.response?.status, err.message);
  }
}

async function fetchAndCacheCategories() {
  const response = await api.get('/categories');
  const data = response.data || response || [];
  if (Array.isArray(data)) {
    await cacheCategories(data);
  }
}

/**
 * Upload pending offline transactions to the server.
 * Called when the app comes back online.
 */
export async function syncPendingTransactions() {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingSyncItems();
    if (pending.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    notifySyncListeners({ type: 'uploadStart', count: pending.length });

    for (const item of pending) {
      try {
        if (item.action === 'checkout') {
          await posApi.checkout(item.payload, { headers: { 'X-Idempotency-Key': item.idempotency_key } });
          await markSynced(item.id);
          synced++;
          notifySyncListeners({ type: 'uploadProgress', synced, total: pending.length });
        }
      } catch (err) {
        const msg = err.structured?.message || err.message || 'Unknown error';
        // If server says duplicate (409), treat as already synced
        if (err.response?.status === 409) {
          await markSynced(item.id);
          synced++;
        } else {
          await markFailed(item.id, msg);
          failed++;
        }
        console.warn('[Sync] Failed to sync transaction:', msg);
      }
    }

    // Clean up synced items
    await clearSyncedItems();
    notifySyncListeners({ type: 'uploadComplete', synced, failed });
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

/**
 * Get current sync status.
 */
export async function getSyncStatus() {
  const pendingCount = await getSyncQueueCount();
  const lastSync = await getMeta('lastSyncTime');
  return {
    pendingCount,
    lastSync,
    isSyncing,
  };
}

/**
 * Full sync: upload pending → download fresh data.
 */
export async function fullSync() {
  const uploadResult = await syncPendingTransactions();
  const downloadSuccess = await syncDataFromServer();
  return { ...uploadResult, downloadSuccess };
}
