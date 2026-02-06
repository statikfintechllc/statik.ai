/**
 * sa.u.js – Self Model & Awareness
 *
 * Maintains an honest model of the system's own capabilities,
 * current state, and confidence metrics.
 * Prevents hallucination – refuses tasks outside known capabilities.
 */

export class SelfModelUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'sa.u';
    this.capabilities = new Map();
    this.metrics = { intentAccuracy: 0, patternSuccess: 0, goalCompletion: 0 };
  }

  init() {
    this._registerDefaults();
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Check if the system can perform a given action */
  canDo(action) {
    return this.capabilities.get(action) ?? false;
  }

  /** Update a metric */
  updateMetric(key, value) {
    if (key in this.metrics) this.metrics[key] = value;
  }

  /** Return current system status snapshot */
  status() {
    return {
      capabilities: Object.fromEntries(this.capabilities),
      metrics: { ...this.metrics },
      timestamp: Date.now(),
    };
  }

  _registerDefaults() {
    this.capabilities.set('parseText', true);
    this.capabilities.set('accessNetwork', false);
    this.capabilities.set('seeImages', false);
    this.capabilities.set('storeMemory', true);
    this.capabilities.set('editCode', false);
  }

  destroy() {}
}
