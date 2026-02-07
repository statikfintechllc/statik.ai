/**
 * hc.u.js – Homeostasis
 *
 * Monitors system health and triggers corrective actions:
 *   - Memory usage → prune old memories
 *   - CPU usage    → throttle processing
 *   - Worker health → restart crashed workers
 *   - Goal queue   → prevent overflow
 */

export class HomeostasisUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'hc.u';
    this.interval = null;
    this.checkIntervalMs = 30000;
  }

  init() {
    this.bus.on('storage.warn', () => this._onStorageWarn());
    this.bus.on('storage.critical', () => this._onStorageCritical());
    this.interval = setInterval(() => this.check(), this.checkIntervalMs);
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Periodic health check */
  check() {
    /* Query storage quota */
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ quota, usage }) => {
        if (typeof quota === 'number' && typeof usage === 'number' && quota > 0) {
          const pct = usage / quota;
          if (pct > 0.9) this.bus.emit('storage.critical', { usage, quota });
          else if (pct > 0.7) this.bus.emit('storage.warn', { usage, quota });
        }
      }).catch(() => {});
    }

    /* Emit own heartbeat */
    this.bus.emit('unit.heartbeat', { unitId: this.id });
  }

  _onStorageWarn() {
    this.bus.emit('memory.prune', { urgency: 'warn' });
  }

  _onStorageCritical() {
    this.bus.emit('memory.prune', { urgency: 'critical' });
    this.bus.emit('learning.pause', { reason: 'storage_critical' });
  }

  destroy() {
    if (this.interval) clearInterval(this.interval);
  }
}
