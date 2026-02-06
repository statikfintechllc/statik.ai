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
    // TODO: query allocator for CPU usage
    // TODO: check worker heartbeats via watchdog
    // TODO: check goal queue depth
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
