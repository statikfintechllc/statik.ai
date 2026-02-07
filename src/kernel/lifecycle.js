/**
 * lifecycle.js – Unit lifecycle management
 *
 * Controls the start, stop, pause, and restart of cognitive units
 * in the correct dependency order defined by the registry.
 */

/** Map of unit id → ES module path (relative to this module – src/kernel/) */
const UNIT_MODULES = {
  'pce.u':       '../units/pce.u.js',
  'as.u':        '../units/as.u.js',
  'ti.u':        '../units/ti.u.js',
  'cm.u':        '../units/cm.u.js',
  'nlp.u':       '../units/nlp.u.js',
  'gm.u':        '../units/gm.u.js',
  'ee.u':        '../units/ee.u.js',
  'dbt.u':       '../units/dbt.u.js',
  'sa.u':        '../units/sa.u.js',
  'ie.u':        '../units/ie.u.js',
  'ec.u':        '../units/ec.u.js',
  'hc.u':        '../units/hc.u.js',
  'ui.u':        '../units/ui.u.js',
  'sync.u':      '../units/sync.u.js',
  'telemetry.u': '../units/telemetry.u.js',
  'dev.u':       '../units/dev.u.js',
  'disc.u':      '../units/disc.u.js',
  'mesh.u':      '../units/mesh.u.js',
  'bridge.u':    '../units/bridge.u.js',
  'deploy.u':    '../units/deploy.u.js',
  'dns.u':       '../units/dns.u.js',
};

/** Map of unit id → exported class name */
const UNIT_CLASSES = {
  'pce.u':       'PerceptionUnit',
  'as.u':        'AttentionUnit',
  'ti.u':        'TemporalUnit',
  'cm.u':        'CoreMemoryUnit',
  'nlp.u':       'NLPUnit',
  'gm.u':        'GoalsUnit',
  'ee.u':        'EvaluationUnit',
  'dbt.u':       'DeltaLedgerUnit',
  'sa.u':        'SelfModelUnit',
  'ie.u':        'IntentExecutionUnit',
  'ec.u':        'ConstraintsUnit',
  'hc.u':        'HomeostasisUnit',
  'ui.u':        'UIUnit',
  'sync.u':      'SyncUnit',
  'telemetry.u': 'TelemetryUnit',
  'dev.u':       'DevToolsUnit',
  'disc.u':      'DiscoveryUnit',
  'mesh.u':      'MeshUnit',
  'bridge.u':    'BridgeUnit',
  'deploy.u':    'DeployUnit',
  'dns.u':       'DNSUnit',
};

export class Lifecycle {
  constructor(bus, registry) {
    this.bus = bus;
    this.registry = registry;
    this.running = new Set();
    this.instances = new Map(); // unitId → unit instance
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
    /* Guard against starting an already-running unit */
    if (this.running.has(unitId)) {
      console.warn('[lifecycle] unit already running:', unitId);
      return;
    }

    const modulePath = UNIT_MODULES[unitId];
    if (!modulePath) {
      console.warn('[lifecycle] unknown unit:', unitId);
      return;
    }

    try {
      const mod = await import(modulePath);
      const className = UNIT_CLASSES[unitId];
      const UnitClass = mod[className];
      if (!UnitClass) {
        console.warn('[lifecycle] class not found:', className, 'in', modulePath);
        return;
      }

      const instance = new UnitClass(this.bus);

      if (typeof instance.init === 'function') {
        await instance.init();
      }

      /* Only track instance after successful init */
      this.instances.set(unitId, instance);
      this.running.add(unitId);
      this.bus.emit('unit.started', { unitId, timestamp: Date.now() });
    } catch (err) {
      /* Defensive cleanup – instance may or may not have been set */
      this.instances.delete(unitId);
      this.running.delete(unitId);
      console.error('[lifecycle] failed to start unit:', unitId, err);
      this.bus.emit('unit.error', { unitId, error: err.message });
    }
  }

  /** Stop a single unit */
  async stop(unitId) {
    const instance = this.instances.get(unitId);
    if (instance && typeof instance.destroy === 'function') {
      try { await instance.destroy(); } catch (_) { /* best-effort */ }
    }
    this.instances.delete(unitId);
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

  /** Get a running unit instance */
  get(unitId) {
    return this.instances.get(unitId) || null;
  }
}
