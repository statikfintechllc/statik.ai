/**
 * network.adapter.js – Network detection and background sync for iOS
 *
 * Detects online/offline state, connection quality,
 * and manages background fetch / sync registration.
 */

export class NetworkAdapter {
  constructor() {
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /** Start monitoring network state changes */
  monitor(callback) {
    if (typeof window === 'undefined') return;
    const onOnline = () => { this.online = true; callback(true); };
    const onOffline = () => { this.online = false; callback(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }

  /** Get connection info (if available) */
  connectionInfo() {
    const conn = navigator.connection || null;
    if (!conn) return null;
    return { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt };
  }

  /** Register a periodic background sync (Service Worker) */
  async registerPeriodicSync(tag, minInterval) {
    if (!('periodicSync' in (await navigator.serviceWorker?.ready || {}))) return false;
    const reg = await navigator.serviceWorker.ready;
    await reg.periodicSync.register(tag, { minInterval });
    return true;
  }
}
