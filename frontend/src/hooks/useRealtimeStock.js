import { useEffect, useRef } from 'react';
import { updateLocalStock } from '../utils/offlineDb';

/**
 * Hook that listens to Server-Sent Events for real-time stock updates.
 * When another device makes a sale, this device's local cache is updated.
 * 
 * @param {Function} onStockUpdate - callback when stock changes (e.g. to reload product list)
 */
export function useRealtimeStock(onStockUpdate) {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !navigator.onLine) return;

    // Use EventSource with auth via URL param (SSE doesn't support custom headers natively)
    // We'll use a polyfill approach — the backend authenticate middleware reads from Authorization header
    // For SSE, we use fetch-based approach instead
    let aborted = false;

    async function connectSSE() {
      try {
        const response = await fetch('/api/events', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok || aborted) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                handleEvent(event);
              } catch { /* ignore parse errors */ }
            }
          }
        }
      } catch {
        // Reconnect after 5s on error
        if (!aborted) setTimeout(connectSSE, 5000);
      }
    }

    function handleEvent(event) {
      if (event.type === 'stock_update' && event.items) {
        // Update local IndexedDB cache
        for (const item of event.items) {
          updateLocalStock(item.product_id, item.quantity_sold);
        }
        // Notify parent component to refresh display
        if (onStockUpdate) onStockUpdate(event);
      }
    }

    connectSSE();

    return () => {
      aborted = true;
    };
  }, [onStockUpdate]);
}
