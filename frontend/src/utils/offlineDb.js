import { openDB } from 'idb';

const DB_NAME = 'mypa_offline';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB with stores for offline POS operation.
 */
export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products cache (keyed by product id)
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by_category', 'category_id');
        productStore.createIndex('by_barcode', 'barcode');
        productStore.createIndex('by_name', 'name');
      }

      // Customers cache
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by_name', 'name');
        customerStore.createIndex('by_phone', 'phone');
      }

      // Categories cache
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      // Sync queue — offline transactions waiting to be uploaded
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by_status', 'status');
        syncStore.createIndex('by_created', 'created_at');
      }

      // Metadata — last sync time, shop info, etc.
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
}

// ─── Products ───────────────────────────────────────────────────

export async function cacheProducts(products) {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  for (const product of products) {
    await tx.store.put(product);
  }
  await tx.done;
}

export async function getCachedProducts({ search, category_id } = {}) {
  const db = await getDb();
  let products = await db.getAll('products');

  if (category_id) {
    products = products.filter(p => p.category_id === Number(category_id));
  }
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    products = products.filter(p =>
      p.name?.toLowerCase().includes(s) ||
      p.barcode?.toLowerCase().includes(s) ||
      p.sku?.toLowerCase().includes(s) ||
      p.brand?.toLowerCase().includes(s)
    );
  }
  return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getCachedProductByBarcode(code) {
  const db = await getDb();
  const product = await db.getFromIndex('products', 'by_barcode', code);
  return product || null;
}

export async function updateLocalStock(productId, quantitySold) {
  const db = await getDb();
  const product = await db.get('products', productId);
  if (product) {
    product.stock = Math.max(0, (product.stock || 0) - quantitySold);
    await db.put('products', product);
  }
}

// ─── Customers ──────────────────────────────────────────────────

export async function cacheCustomers(customers) {
  const db = await getDb();
  const tx = db.transaction('customers', 'readwrite');
  for (const customer of customers) {
    await tx.store.put(customer);
  }
  await tx.done;
}

export async function getCachedCustomers(query) {
  const db = await getDb();
  let customers = await db.getAll('customers');
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    customers = customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }
  return customers.slice(0, 20);
}

// ─── Categories ─────────────────────────────────────────────────

export async function cacheCategories(categories) {
  const db = await getDb();
  const tx = db.transaction('categories', 'readwrite');
  for (const cat of categories) {
    await tx.store.put(cat);
  }
  await tx.done;
}

export async function getCachedCategories() {
  const db = await getDb();
  return db.getAll('categories');
}

// ─── Sync Queue ─────────────────────────────────────────────────

export async function addToSyncQueue(transaction) {
  const db = await getDb();
  const idempotencyKey = transaction.idempotency_key || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  await db.add('syncQueue', {
    ...transaction,
    idempotency_key: idempotencyKey,
    status: 'pending',
    created_at: new Date().toISOString(),
    retries: 0,
  });
  return idempotencyKey;
}

export async function getPendingSyncItems() {
  const db = await getDb();
  const all = await db.getAllFromIndex('syncQueue', 'by_status', 'pending');
  return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function markSynced(id) {
  const db = await getDb();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.status = 'synced';
    item.synced_at = new Date().toISOString();
    await db.put('syncQueue', item);
  }
}

export async function markFailed(id, error) {
  const db = await getDb();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.retries = (item.retries || 0) + 1;
    item.last_error = error;
    if (item.retries >= 5) {
      item.status = 'failed';
    }
    await db.put('syncQueue', item);
  }
}

export async function getSyncQueueCount() {
  const db = await getDb();
  const items = await db.getAllFromIndex('syncQueue', 'by_status', 'pending');
  return items.length;
}

export async function clearSyncedItems() {
  const db = await getDb();
  const tx = db.transaction('syncQueue', 'readwrite');
  const items = await tx.store.getAll();
  for (const item of items) {
    if (item.status === 'synced') {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
}

export async function getAllSyncItems() {
  const db = await getDb();
  const items = await db.getAll('syncQueue');
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function retrySyncItem(id) {
  const db = await getDb();
  const item = await db.get('syncQueue', id);
  if (item && item.status === 'failed') {
    item.status = 'pending';
    item.retries = 0;
    item.last_error = null;
    await db.put('syncQueue', item);
  }
}

export async function deleteSyncItem(id) {
  const db = await getDb();
  await db.delete('syncQueue', id);
}

// ─── Metadata ───────────────────────────────────────────────────

export async function setMeta(key, value) {
  const db = await getDb();
  await db.put('meta', { key, value, updated_at: new Date().toISOString() });
}

export async function getMeta(key) {
  const db = await getDb();
  const item = await db.get('meta', key);
  return item?.value || null;
}
