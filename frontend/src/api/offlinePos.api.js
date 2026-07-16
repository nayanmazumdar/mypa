/**
 * Offline-First POS API layer.
 * 
 * POS ALWAYS reads from local IndexedDB — never waits for network.
 * Checkouts ALWAYS save locally first, then sync to server in background.
 * This ensures zero-latency billing regardless of network state.
 */
import { posApi } from './pos.api';
import api from './axios';
import {
  getCachedProducts, getCachedProductByBarcode,
  getCachedCustomers, getCachedCategories,
  addToSyncQueue, updateLocalStock, getSyncQueueCount,
} from '../utils/offlineDb';

/**
 * Get products — ALWAYS from local cache (instant).
 * Background sync keeps cache fresh separately.
 */
export async function getProducts(params = {}) {
  const products = await getCachedProducts({
    search: params.search,
    category_id: params.category_id,
  });

  // If cache is empty and we're online, try fetching once
  if (products.length === 0 && navigator.onLine) {
    try {
      const response = await posApi.getProducts(params);
      return response;
    } catch {
      // Still nothing — return empty
    }
  }

  return {
    success: true,
    data: products,
    pagination: { page: 1, limit: products.length, total: products.length, totalPages: 1 },
    _offline: true,
  };
}

/**
 * Barcode lookup — ALWAYS from local cache (instant).
 */
export async function lookupBarcode(code) {
  const product = await getCachedProductByBarcode(code);
  if (product) return { success: true, data: product, _offline: true };

  // Cache miss — try network as last resort
  if (navigator.onLine) {
    try {
      const response = await posApi.lookupBarcode(code);
      return response;
    } catch { /* fall through */ }
  }

  throw new Error('Product not found for this barcode');
}

/**
 * Customer search — ALWAYS from local cache (instant).
 */
export async function searchCustomers(query) {
  const customers = await getCachedCustomers(query);
  if (customers.length > 0) {
    return { success: true, data: customers, _offline: true };
  }

  // Cache empty — try network
  if (navigator.onLine) {
    try {
      return await api.get('/customers/search/quick', { params: { q: query } });
    } catch { /* fall through */ }
  }

  return { success: true, data: [], _offline: true };
}

/**
 * Get categories — ALWAYS from local cache (instant).
 */
export async function getCategories() {
  const categories = await getCachedCategories();
  if (categories.length > 0) {
    return { success: true, data: categories, _offline: true };
  }

  // Cache empty — try network
  if (navigator.onLine) {
    try {
      return await api.get('/categories');
    } catch { /* fall through */ }
  }

  return { success: true, data: [], _offline: true };
}

/**
 * Checkout — ALWAYS saves locally first (instant receipt).
 * Then attempts server sync in background.
 * 
 * This guarantees the shopkeeper NEVER waits for network during billing.
 */
export async function checkout(data) {
  // Generate a proper receipt number (looks professional on printed receipts)
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  const receiptNumber = `RCP-${datePart}-${rand}`;
  const offlineId = `${datePart}${timePart}-${rand}`;

  const totalAmount = data.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const discount = data.discount || 0;
  const netAmount = Math.round((totalAmount - discount) * 100) / 100;
  const amountReceived = data.amount_received || netAmount;
  const changeAmount = Math.max(0, Math.round((amountReceived - netAmount) * 100) / 100);

  // Update local stock immediately
  for (const item of data.items) {
    await updateLocalStock(item.product_id, item.quantity);
  }

  // Queue for server sync (use offlineId as the idempotency key)
  await addToSyncQueue({
    action: 'checkout',
    payload: data,
    offlineId,
    idempotency_key: offlineId, // Same key used by backgroundSync
  });

  const pendingCount = await getSyncQueueCount();

  // Try to sync to server in background (non-blocking)
  if (navigator.onLine) {
    backgroundSync(data, offlineId);
  }

  return {
    success: true,
    data: {
      id: offlineId,
      uuid: offlineId,
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      discount,
      net_amount: netAmount,
      payment_method: data.payments
        ? (data.payments.length > 1 ? 'split' : data.payments[0]?.method || 'cash')
        : (data.payment_method || 'cash'),
      payments: data.payments || null,
      amount_received: amountReceived,
      change_amount: changeAmount,
      items: data.items.map(i => ({ ...i, total: Math.round(i.quantity * i.unit_price * 100) / 100 })),
      customer_name: data.customer_name,
      created_at: now.toISOString(),
      _offline: true,
      _pendingSync: pendingCount,
    },
    message: 'Sale recorded.',
    _offline: true,
  };
}

/**
 * Background sync — attempt to push to server without blocking the UI.
 * If it succeeds, the sync queue item will be marked as synced later
 * by the regular sync service. This is just an eager attempt.
 */
async function backgroundSync(data, offlineId) {
  try {
    await posApi.checkout(data, {
      headers: { 'X-Idempotency-Key': offlineId },
      timeout: 5000,
    });
    // Success — the sync service will mark it synced on next run
  } catch {
    // Failed — no problem, sync service will retry later
  }
}
