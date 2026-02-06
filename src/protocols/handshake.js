/**
 * handshake.js – Unit initialisation protocol
 *
 * Handles the startup handshake between the kernel and each unit:
 *   1. Kernel sends 'unit.init' with config
 *   2. Unit performs setup
 *   3. Unit emits 'unit.ready'
 *   4. Kernel marks unit as active
 */

export class Handshake {
  constructor(bus) {
    this.bus = bus;
    this.pending = new Map(); // unitId → { resolve, timer }
  }

  /** Initiate handshake with a unit (returns promise) */
  initiate(unitId, config, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(unitId);
        reject(new Error(`Handshake timeout: ${unitId}`));
      }, timeoutMs);

      this.pending.set(unitId, { resolve, timer });

      this.bus.on('unit.ready', (msg) => {
        if (msg.unitId === unitId) {
          clearTimeout(timer);
          this.pending.delete(unitId);
          resolve({ unitId, timestamp: Date.now() });
        }
      });

      this.bus.emit('unit.init', { unitId, config });
    });
  }
}
