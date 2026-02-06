/**
 * sw.proxy.js – Service Worker as Local Proxy
 *
 * When true HTTP server binding isn't possible (browser context),
 * the Service Worker acts as a local proxy:
 *   1. Intercepts all requests to the app scope
 *   2. Serves from cache → IndexedDB → OPFS → 404
 *
 * Limitations:
 *   - Cannot bind to TCP ports
 *   - Cannot serve to external HTTP requests
 *   - CAN serve within the browser context
 */

export class ServiceWorkerProxy {
  constructor() {
    this.registered = false;
  }

  /** Check if Service Worker is available and registered */
  async check() {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    this.registered = !!reg;
    return this.registered;
  }

  /** Register (or re-register) the Service Worker */
  async register(swPath = './sw.js') {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.register(swPath, { scope: './' });
    this.registered = true;
    return reg;
  }

  /** Send a message to the active Service Worker */
  async postMessage(msg) {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) reg.active.postMessage(msg);
  }

  /** Unregister the Service Worker */
  async unregister() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.unregister();
    this.registered = false;
  }
}
