/**
 * telemetry.u.js – Observability (local only)
 *
 * Metrics collected (never sent externally):
 *   - Message throughput (msgs/sec per channel)
 *   - Unit CPU time (ms)
 *   - Memory usage (MB per unit)
 *   - Error rates
 *   - Goal completion time
 */

export class TelemetryUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'telemetry.u';
    this.metrics = {};
    this.errors = [];
  }

  init() {
    this.bus.on('unit.heartbeat', (e) => this._recordHeartbeat(e));
    this.bus.on('outcome.failure', (e) => this._recordError(e));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Record a named metric */
  record(name, value) {
    this.metrics[name] = { value, timestamp: Date.now() };
  }

  /** Return all current metrics */
  snapshot() {
    return { metrics: { ...this.metrics }, errors: [...this.errors], timestamp: Date.now() };
  }

  _recordHeartbeat(event) {
    this.record(`heartbeat.${event.unitId}`, Date.now());
  }

  _recordError(event) {
    this.errors.push({ ...event, timestamp: Date.now() });
    if (this.errors.length > 500) this.errors.shift();
  }

  destroy() {}
}
