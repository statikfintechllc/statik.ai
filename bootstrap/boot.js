/**
 * boot.js – Orchestrates first load of Statik.ai CSA.OS
 *
 * Boot phases:
 *   1. DETECT  – capability detection
 *   2. INIT    – kernel + bus + workers
 *   3. HYDRATE – restore or init state
 *   4. WAKE    – start units in dependency order
 *   5. READY   – emit system.ready
 */

import { detect } from './detect.js';
import { hydrate } from './hydrate.js';
import { recover } from './recover.js';

const BOOT_PHASES = ['detect', 'init', 'hydrate', 'wake', 'ready'];

export async function boot() {
  const status = { phase: null, error: null, capabilities: null };

  try {
    /* Phase 1 – DETECT */
    status.phase = 'detect';
    status.capabilities = await detect();

    /* Phase 2 – INIT */
    status.phase = 'init';
    // TODO: import and initialise kernel.u, bus.u, spawn workers

    /* Phase 3 – HYDRATE */
    status.phase = 'hydrate';
    await hydrate();

    /* Phase 4 – WAKE */
    status.phase = 'wake';
    // TODO: start units via lifecycle.js in dependency order

    /* Phase 5 – READY */
    status.phase = 'ready';
    // TODO: emit 'system.ready' on bus

  } catch (err) {
    status.error = err;
    await recover(status);
  }

  return status;
}

/* Auto-boot when loaded as entry point */
if (typeof window !== 'undefined') {
  boot().then((s) => {
    if (s.error) console.error('[boot] failed at phase:', s.phase, s.error);
    else console.log('[boot] system ready');
  });
}
