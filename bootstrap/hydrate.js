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

/** Fixed key used for the single kernel_state record */
const KERNEL_STATE_KEY = 'latest';

export async function hydrate() {
  const existing = await loadSavedState();

  if (existing) {
    existing.boot_count = (existing.boot_count || 0) + 1;
    await persistKernelState(existing);
    return { fresh: false, state: existing };
  }

  /* No prior state – start fresh with defaults */
  const state = { ...DEFAULT_STATE, _key: KERNEL_STATE_KEY, created: Date.now() };
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
    const req = indexedDB.open('statik_state', 2);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      /* Migrate: drop old boot_count-keyed store, create _key-keyed store */
      if (db.objectStoreNames.contains('kernel_state')) {
        db.deleteObjectStore('kernel_state');
      }
      db.createObjectStore('kernel_state', { keyPath: '_key' });
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
      const getReq = store.get(KERNEL_STATE_KEY);
      getReq.onsuccess = () => {
        db.close();
        resolve(getReq.result || null);
      };
      getReq.onerror = () => { db.close(); resolve(null); };
    };
  });
}

/** Persist kernel state to IndexedDB using a fixed key */
async function persistKernelState(state) {
  if (typeof indexedDB === 'undefined') return;

  /* Ensure the record has the fixed key */
  state._key = KERNEL_STATE_KEY;

  return new Promise((resolve) => {
    const req = indexedDB.open('statik_state', 2);
    req.onerror = () => resolve();
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (db.objectStoreNames.contains('kernel_state')) {
        db.deleteObjectStore('kernel_state');
      }
      db.createObjectStore('kernel_state', { keyPath: '_key' });
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
