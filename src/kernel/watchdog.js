/**
 * watchdog.js – Crash detection and recovery
 *
 * Monitors unit health via heartbeat messages on the bus.
 * If a unit stops responding, attempts restart via lifecycle.
 */

export class Watchdog {
  constructor(bus) {
    this.bus = bus;
    this.heartbeats = new Map(); // unitId → last timestamp
    this.restarting = new Set(); // units currently being restarted
    this.interval = null;
    this.timeoutMs = 30000; // consider dead after 30s silence
  }

  /** Begin monitoring */
  start(lifecycle) {
    if (this.interval) clearInterval(this.interval);
    this.lifecycle = lifecycle;
    this.bus.on('unit.heartbeat', (msg) => {
      this.heartbeats.set(msg.unitId, Date.now());
      this.restarting.delete(msg.unitId);
    });
    this.interval = setInterval(() => this.check(), this.timeoutMs / 2);
  }

  /** Stop monitoring */
  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  /** Check for unresponsive units */
  check() {
    const now = Date.now();
    for (const [unitId, last] of this.heartbeats) {
      if (now - last > this.timeoutMs && !this.restarting.has(unitId)) {
        console.warn('[watchdog] unit unresponsive:', unitId);
        this.bus.emit('unit.unresponsive', { unitId, lastSeen: last });
        this.restarting.add(unitId);
        this.heartbeats.delete(unitId);
        if (this.lifecycle) {
          this.lifecycle.restart(unitId).catch((err) => {
            console.error('[watchdog] restart failed:', unitId, err);
            this.restarting.delete(unitId);
          });
        }
      }
    }
  }
}
