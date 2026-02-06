/**
 * recover.js – Error recovery and safe-mode fallback
 *
 * When any boot phase fails the system enters safe mode:
 *   - Minimal UI (error message + reset button)
 *   - Core units only
 *   - Option to clear state and reboot
 */

export async function recover(status) {
  console.error('[recover] entering safe mode – failed at:', status.phase, status.error);

  // TODO: render minimal safe-mode UI
  // TODO: allow user to reset state or restore from backup

  if (typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding:2rem;font-family:system-ui;color:#f44">
          <h2>Statik.ai – Safe Mode</h2>
          <p>Boot failed during <strong>${status.phase}</strong> phase.</p>
          <pre>${status.error?.message || 'Unknown error'}</pre>
          <button id="reset-btn" style="margin-top:1rem;padding:.5rem 1rem;cursor:pointer">
            Reset &amp; Reboot
          </button>
        </div>`;
      document.getElementById('reset-btn')?.addEventListener('click', async () => {
        await clearAllState();
        location.reload();
      });
    }
  }
}

async function clearAllState() {
  // Delete IndexedDB databases
  const dbs = ['statik_memory', 'statik_state', 'statik_logs'];
  await Promise.allSettled(dbs.map((name) => new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = resolve;
    req.onerror = reject;
  })));
}
