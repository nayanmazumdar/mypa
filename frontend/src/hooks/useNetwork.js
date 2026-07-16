import { useState, useEffect, useCallback, useRef } from 'react';
import { syncPendingTransactions, syncDataFromServer, getSyncStatus, onSyncChange } from '../utils/syncService';
import toast from 'react-hot-toast';

/**
 * Hook to monitor network status and trigger auto-sync.
 * 
 * Returns:
 * - isOnline: boolean
 * - pendingCount: number of queued offline transactions
 * - lastSync: ISO timestamp of last successful sync
 * - isSyncing: boolean
 * - triggerSync: manual sync function
 */
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInterval = useRef(null);
  const wasOffline = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        toast.success('Back online! Syncing data...', { id: 'network-online' });
        handleAutoSync();
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
      toast('You are offline. POS will continue working.', {
        id: 'network-offline',
        icon: '📡',
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for sync service events
  useEffect(() => {
    const unsub = onSyncChange((event) => {
      if (event.type === 'uploadStart') setIsSyncing(true);
      if (event.type === 'uploadComplete') {
        setIsSyncing(false);
        if (event.synced > 0) {
          toast.success(`Synced ${event.synced} offline transaction${event.synced > 1 ? 's' : ''}`, { id: 'sync-done' });
        }
        if (event.failed > 0) {
          toast.error(`${event.failed} transaction${event.failed > 1 ? 's' : ''} failed to sync`, { id: 'sync-fail' });
        }
      }
      refreshStatus();
    });
    return unsub;
  }, []);

  // Periodic status check and background sync
  useEffect(() => {
    refreshStatus();
    syncInterval.current = setInterval(() => {
      refreshStatus();
      // Auto-sync every 2 minutes if online and has pending items
      if (navigator.onLine) {
        syncPendingTransactions();
      }
    }, 120000);

    // Check cache staleness on mount
    checkCacheStaleness();

    return () => clearInterval(syncInterval.current);
  }, []);

  const refreshStatus = useCallback(async () => {
    const status = await getSyncStatus();
    setPendingCount(status.pendingCount);
    setLastSync(status.lastSync);
    setIsSyncing(status.isSyncing);
  }, []);

  const handleAutoSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncPendingTransactions();
      await syncDataFromServer();
    } finally {
      setIsSyncing(false);
      refreshStatus();
    }
  }, [refreshStatus]);

  const checkCacheStaleness = useCallback(async () => {
    const status = await getSyncStatus();
    if (status.lastSync) {
      const lastSyncTime = new Date(status.lastSync);
      const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 4 && navigator.onLine) {
        toast('Product data is stale. Syncing fresh data...', { icon: '⚠️', id: 'stale-cache', duration: 3000 });
        syncDataFromServer();
      }
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncPendingTransactions();
      await syncDataFromServer();
      await refreshStatus();
      if (result.synced === 0 && result.failed === 0) {
        toast.success('Everything is up to date', { id: 'sync-uptodate' });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  return { isOnline, pendingCount, lastSync, isSyncing, triggerSync };
}
