/**
 * lifecycle.js – Unit lifecycle management
 *
 * Controls the start, stop, pause, and restart of cognitive units
 * in the correct dependency order defined by the registry.
 */

export class Lifecycle {
  constructor(bus, registry) {
    this.bus = bus;
    this.registry = registry;
    this.running = new Set();
  }

  /** Wake all registered units in dependency order */
  async wakeAll() {
    const order = this.registry.bootOrder();
    for (const unitId of order) {
      await this.start(unitId);
    }
  }

  /** Start a single unit */
  async start(unitId) {
    // TODO: dynamically import unit module
    // TODO: call unit.init(), wait for 'ready' on bus
    this.running.add(unitId);
    this.bus.emit('unit.started', { unitId, timestamp: Date.now() });
  }

  /** Stop a single unit */
  async stop(unitId) {
    // TODO: call unit.destroy()
    this.running.delete(unitId);
    this.bus.emit('unit.stopped', { unitId, timestamp: Date.now() });
  }

  /** Restart a unit (stop then start) */
  async restart(unitId) {
    await this.stop(unitId);
    await this.start(unitId);
  }

  /** Shutdown all units in reverse order */
  async shutdownAll() {
    const order = [...this.registry.bootOrder()].reverse();
    for (const unitId of order) {
      if (this.running.has(unitId)) await this.stop(unitId);
    }
  }
}
