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

/** Worker manifest – path relative to project root */
const WORKER_DEFS = [
  { id: 'cognition', file: 'src/workers/cognition.worker.js' },
  { id: 'memory',    file: 'src/workers/memory.worker.js' },
  { id: 'nlp',       file: 'src/workers/nlp.worker.js' },
  { id: 'compute',   file: 'src/workers/compute.worker.js' },
];

export class Kernel {
  constructor() {
    this.bus = null;
    this.registry = null;
    this.lifecycle = null;
    this.watchdog = null;
    this.workers = new Map();
    this.state = 'idle'; // idle | booting | ready | error
  }

  /** Initialise core subsystems */
  async init(capabilities) {
    this.state = 'booting';

    this.bus = new Bus();
    this.registry = new Registry();
    this.lifecycle = new Lifecycle(this.bus, this.registry);
    this.watchdog = new Watchdog(this.bus);

    this._spawnWorkers(capabilities);
    await this._loadRegistry();
  }

  /** Start all units in dependency order */
  async wake() {
    await this.lifecycle.wakeAll();
    this.watchdog.start(this.lifecycle);
    this.state = 'ready';
    this.bus.emit('system.ready', { timestamp: Date.now() });
  }

  /** Graceful shutdown */
  async shutdown() {
    this.watchdog.stop();
    await this.lifecycle.shutdownAll();
    this._terminateWorkers();
    this.state = 'idle';
  }

  /* ── internal ──────────────────────────────────────── */

  /** Spawn Web Workers for off-main-thread processing */
  _spawnWorkers(capabilities) {
    if (typeof Worker === 'undefined') return;
    for (const def of WORKER_DEFS) {
      try {
        const w = new Worker(def.file, { type: 'module' });
        w.onerror = (e) => this.bus.emit('worker.error', { id: def.id, error: e.message });
        this.workers.set(def.id, w);
      } catch (_) {
        /* Worker not available in this environment – continue */
      }
    }
  }

  /** Terminate all workers */
  _terminateWorkers() {
    for (const [, w] of this.workers) w.terminate();
    this.workers.clear();
  }

  /** Load unit registry from embedded manifest */
  async _loadRegistry() {
    try {
      const res = await fetch('configs/units.registry.json');
      const manifest = await res.json();
      this.registry.load(manifest);
    } catch (_) {
      /* Fallback: load inline minimal registry so system can still boot */
      this.registry.load({
        units: [],
        bootOrder: ['pce.u','as.u','ti.u','cm.u','nlp.u','gm.u','ee.u','dbt.u','sa.u','ie.u','ec.u','hc.u','ui.u'],
      });
    }
  }
}
