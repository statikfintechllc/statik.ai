/**
 * kernel.u.js – Main coordinator for CSA.OS
 *
 * Responsibilities:
 *   - Initialise the message bus
 *   - Spawn web workers
 *   - Load the unit registry
 *   - Coordinate boot phases (init → wake → ready)
 *   - Emit 'system.ready' when all units report ready
 */

import { Bus } from '../bus/bus.u.js';
import { Lifecycle } from './lifecycle.js';
import { Registry } from './registry.js';
import { Watchdog } from './watchdog.js';

export class Kernel {
  constructor() {
    this.bus = null;
    this.registry = null;
    this.lifecycle = null;
    this.watchdog = null;
    this.state = 'idle'; // idle | booting | ready | error
  }

  /** Initialise core subsystems */
  async init(capabilities) {
    this.state = 'booting';

    this.bus = new Bus();
    this.registry = new Registry();
    this.lifecycle = new Lifecycle(this.bus, this.registry);
    this.watchdog = new Watchdog(this.bus);

    // TODO: spawn workers based on capabilities
    // TODO: load unit registry from configs/units.registry.json
  }

  /** Start all units in dependency order */
  async wake() {
    await this.lifecycle.wakeAll();
    this.state = 'ready';
    this.bus.emit('system.ready', { timestamp: Date.now() });
  }

  /** Graceful shutdown */
  async shutdown() {
    await this.lifecycle.shutdownAll();
    this.state = 'idle';
  }
}
