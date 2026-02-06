/**
 * recover.js – Error recovery and safe-mode fallback
 *
 * When any boot phase fails the system enters safe mode:
 *   - Minimal UI (error message + reset button)
 *   - Core units only
 *   - Option to clear state and reboot
 *   - Option to restore from backup
 */

export async function recover(status) {
  console.error('[recover] entering safe mode – failed at:', status.phase, status.error);

  if (typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding:2rem;font-family:system-ui;color:#f44;background:#0a0a0a;height:100vh">
          <h2 style="color:#ff4444">⚠ Statik.ai – Safe Mode</h2>
          <p style="color:#e0e0e0">Boot failed during <strong>${status.phase}</strong> phase.</p>
          <pre style="color:#aaa;margin:1rem 0;padding:1rem;background:#141414;border-radius:8px;overflow:auto">${status.error?.stack || status.error?.message || 'Unknown error'}</pre>
          <div style="display:flex;gap:0.5rem;margin-top:1rem">
            <button id="reset-btn" style="padding:.5rem 1rem;cursor:pointer;background:#222;color:#e0e0e0;border:1px solid #444;border-radius:8px">
              Reset &amp; Reboot
            </button>
            <button id="export-logs-btn" style="padding:.5rem 1rem;cursor:pointer;background:#222;color:#e0e0e0;border:1px solid #444;border-radius:8px">
              Export Diagnostics
            </button>
          </div>
          <p style="color:#666;margin-top:1rem;font-size:0.85rem">
            Reset clears all stored data. Export saves diagnostic info for debugging.
          </p>
        </div>`;

      document.getElementById('reset-btn')?.addEventListener('click', async () => {
        await clearAllState();
        location.reload();
      });

      document.getElementById('export-logs-btn')?.addEventListener('click', () => {
        const diag = {
          timestamp: new Date().toISOString(),
          phase: status.phase,
          error: status.error?.message || null,
          stack: status.error?.stack || null,
          userAgent: navigator.userAgent,
          capabilities: status.capabilities || null,
        };
        const blob = new Blob([JSON.stringify(diag, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statik-diagnostic-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }
}

async function clearAllState() {
  /* Delete IndexedDB databases */
  const dbs = ['statik_memory', 'statik_state', 'statik_logs'];
  await Promise.allSettled(dbs.map((name) => new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = resolve;
    req.onerror = reject;
  })));

  /* Clear OPFS if available */
  if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory();
      for await (const name of root.keys()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch (_) { /* best-effort */ }
  }

  /* Clear service worker caches */
  if (typeof caches !== 'undefined') {
    const names = await caches.keys();
    await Promise.allSettled(names.map((n) => caches.delete(n)));
  }
}
