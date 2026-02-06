/**
 * hydrate.js – Rehydrate system state from persisted storage
 *
 * On cold start checks IndexedDB for previously saved state.
 * If found, restores unit states and kernel state.
 * If not, initialises fresh state from defaults.
 */

/** Default system state used on first boot */
const DEFAULT_STATE = {
  version: '0.1.0',
  boot_count: 1,
  created: Date.now(),
  units: {},
};

export async function hydrate() {
  const existing = await loadSavedState();

  if (existing) {
    existing.boot_count = (existing.boot_count || 0) + 1;
    await persistKernelState(existing);
    return { fresh: false, state: existing };
  }

  /* No prior state – start fresh with defaults */
  const state = { ...DEFAULT_STATE, created: Date.now() };
  await persistKernelState(state);
  return { fresh: true, state };
}

/**
 * Attempt to read the most recent kernel state from IndexedDB.
 * Returns null when no prior state exists.
 */
async function loadSavedState() {
  if (typeof indexedDB === 'undefined') return null;

  return new Promise((resolve) => {
    const req = indexedDB.open('statik_state', 1);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kernel_state')) {
        db.createObjectStore('kernel_state', { keyPath: 'boot_count' });
      }
      if (!db.objectStoreNames.contains('unit_states')) {
        db.createObjectStore('unit_states', { keyPath: 'unit_id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kernel_state')) {
        db.close();
        return resolve(null);
      }
      const tx = db.transaction('kernel_state', 'readonly');
      const store = tx.objectStore('kernel_state');
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const results = getAll.result;
        let latest = null;
        if (Array.isArray(results) && results.length > 0) {
          latest = results.reduce((acc, item) => {
            if (!item || typeof item.boot_count !== 'number') return acc || null;
            if (!acc || typeof acc.boot_count !== 'number') return item;
            return item.boot_count > acc.boot_count ? item : acc;
          }, null);
        }
        db.close();
        resolve(latest || null);
      };
      getAll.onerror = () => { db.close(); resolve(null); };
    };
  });
}

/** Persist kernel state to IndexedDB */
async function persistKernelState(state) {
  if (typeof indexedDB === 'undefined') return;

  return new Promise((resolve) => {
    const req = indexedDB.open('statik_state', 1);
    req.onerror = () => resolve();
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kernel_state')) {
        db.createObjectStore('kernel_state', { keyPath: 'boot_count' });
      }
      if (!db.objectStoreNames.contains('unit_states')) {
        db.createObjectStore('unit_states', { keyPath: 'unit_id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('kernel_state', 'readwrite');
        tx.objectStore('kernel_state').put(state);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      } catch (_) {
        db.close();
        resolve();
      }
    };
  });
}
