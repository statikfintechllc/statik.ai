/**
 * dev.u.js – Developer Tools
 *
 * Accessible via ?dev=true URL parameter.
 *
 * Features:
 *   1. Simulation mode – inject fake inputs
 *   2. Time travel     – replay message history
 *   3. Unit isolation  – test single unit with mocks
 *   4. Chaos testing   – randomly drop messages / simulate crashes
 */

export class DevToolsUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'dev.u';
    this.enabled = false;
  }

  init() {
    if (typeof location !== 'undefined') {
      const params = new URLSearchParams(location.search);
      this.enabled = params.get('dev') === 'true';
    }
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Inject a simulated input into the bus */
  simulate(topic, payload) {
    if (!this.enabled) return;
    this.bus.emit(topic, { ...payload, _simulated: true });
  }

  /** Replay the last N messages from bus history */
  replay(count = 10) {
    if (!this.enabled) return [];
    const history = this.bus.history || [];
    return history.slice(-count);
  }

  destroy() {}
}
