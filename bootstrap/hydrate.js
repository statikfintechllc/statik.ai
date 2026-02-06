/**
 * hydrate.js – Rehydrate system state from persisted storage
 *
 * On cold start checks IndexedDB for previously saved state.
 * If found, restores unit states and kernel state.
 * If not, initialises fresh state from defaults.
 */

export async function hydrate() {
  const existing = await loadSavedState();

  if (existing) {
    // TODO: push saved state into kernel + units
    return { fresh: false, state: existing };
  }

  // No prior state – start fresh
  // TODO: initialise default state from configs/defaults.json
  return { fresh: true, state: null };
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
    req.onupgradeneeded = () => resolve(null); // DB doesn't exist yet
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kernel_state')) {
        db.close();
        return resolve(null);
      }
      const tx = db.transaction('kernel_state', 'readonly');
      const store = tx.objectStore('kernel_state');
      const get = store.get('current');
      get.onsuccess = () => { db.close(); resolve(get.result || null); };
      get.onerror = () => { db.close(); resolve(null); };
    };
  });
}
