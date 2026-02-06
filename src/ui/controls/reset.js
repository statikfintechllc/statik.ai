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
    // TODO: clear IndexedDB databases
    // TODO: clear OPFS
    // TODO: reload page
  }
}
