/**
 * reset.js – System reset control
 *
 * Allows resetting individual units or the entire system.
 */

export class ResetControl {
  constructor(bus) {
    this.bus = bus;
  }

  /** Reset a single unit */
  resetUnit(unitId) {
    this.bus.emit('unit.reset', { unitId, timestamp: Date.now() });
  }

  /** Full system reset – clears all state */
  async resetAll() {
    this.bus.emit('system.reset', { timestamp: Date.now() });

    /* Clear IndexedDB databases */
    if (typeof indexedDB !== 'undefined') {
      const dbs = ['statik_memory', 'statik_state', 'statik_logs'];
      await Promise.allSettled(dbs.map((name) => new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = resolve;
        req.onerror = reject;
      })));
    }

    /* Clear OPFS if available */
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        for await (const name of root.keys()) {
          await root.removeEntry(name, { recursive: true });
        }
      } catch (_) { /* best-effort */ }
    }

    /* Reload the page */
    if (typeof location !== 'undefined') location.reload();
  }
}
