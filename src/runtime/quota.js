/**
 * quota.js – Storage quota management
 *
 * Monitors IndexedDB and OPFS usage against configured limits.
 * Emits warnings when thresholds are approached.
 */

export class QuotaManager {
  constructor(bus, constraints) {
    this.bus = bus;
    this.warnPercent = constraints?.storage?.warn_percent ?? 80;
    this.criticalPercent = constraints?.storage?.critical_percent ?? 95;
  }

  /** Check current storage usage and emit warnings if needed */
  async check() {
    if (!navigator.storage?.estimate) return null;

    const { quota, usage } = await navigator.storage.estimate();
    const percent = quota ? (usage / quota) * 100 : 0;

    if (percent >= this.criticalPercent) {
      this.bus.emit('storage.critical', { percent, quota, usage });
    } else if (percent >= this.warnPercent) {
      this.bus.emit('storage.warn', { percent, quota, usage });
    }

    return { quota, usage, percent };
  }

  /** Request persistent storage (won't be evicted by browser) */
  async requestPersistence() {
    if (!navigator.storage?.persist) return false;
    return navigator.storage.persist();
  }
}
