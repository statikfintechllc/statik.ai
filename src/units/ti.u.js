/**
 * ti.u.js – Temporal Integrator
 *
 * Adds temporal context to salient frames:
 *   - sequence numbering
 *   - sliding windows (immediate / session / episodic)
 *   - session boundary detection
 *   - causal chain tracking
 */

export class TemporalUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ti.u';
    this.sequence = 0;
    this.sessionTimeout = 600000; // 10 min
    this.lastTimestamp = null;
    this.windows = { immediate: [], session: [], episodic: [] };
  }

  init() {
    this.bus.on('context.salient', (frame) => this.integrate(frame));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Add temporal metadata and emit */
  integrate(frame) {
    this.sequence++;
    const isNewSession = this.lastTimestamp && (Date.now() - this.lastTimestamp > this.sessionTimeout);
    this.lastTimestamp = Date.now();

    if (isNewSession) {
      this.windows.session = [];
      this.bus.emit('session.boundary', { sequence: this.sequence });
    }

    const temporal = { ...frame, sequence: this.sequence, isNewSession };

    this.windows.immediate.push(temporal);
    if (this.windows.immediate.length > 10) this.windows.immediate.shift();
    this.windows.session.push(temporal);

    this.bus.emit('context.temporal', temporal);
  }

  destroy() {}
}
