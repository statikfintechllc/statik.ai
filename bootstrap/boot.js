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
import { Kernel } from '../src/kernel/kernel.u.js';

export async function boot() {
  const status = { phase: null, error: null, capabilities: null, kernel: null };

  try {
    /* Phase 1 – DETECT */
    status.phase = 'detect';
    status.capabilities = await detect();

    /* Phase 2 – INIT */
    status.phase = 'init';
    const kernel = new Kernel();
    await kernel.init(status.capabilities);
    status.kernel = kernel;

    /* Phase 3 – HYDRATE */
    status.phase = 'hydrate';
    const hydrateResult = await hydrate();
    if (hydrateResult && !hydrateResult.fresh && hydrateResult.state) {
      kernel.bus.emit('state.hydrated', hydrateResult.state);
    }

    /* Phase 4 – WAKE */
    status.phase = 'wake';
    await kernel.wake();

    /* Phase 5 – READY */
    status.phase = 'ready';

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
