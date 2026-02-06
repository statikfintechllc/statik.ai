/**
 * db.js – IndexedDB initialisation
 *
 * Creates and manages three databases:
 *   1. statik_memory – episodes, concepts, skills
 *   2. statik_state  – unit states, kernel state
 *   3. statik_logs   – deltas, errors, actions (append-only)
 */

const DB_CONFIGS = {
  statik_memory: {
    version: 1,
    stores: {
      episodes: { keyPath: 'id' },
      concepts: { keyPath: 'id' },
      skills:   { keyPath: 'id' },
    },
  },
  statik_state: {
    version: 1,
    stores: {
      unit_states:  { keyPath: 'unit_id' },
      kernel_state: { keyPath: 'boot_count' },
    },
  },
  statik_logs: {
    version: 1,
    stores: {
      deltas:  { keyPath: 'timestamp' },
      errors:  { keyPath: 'timestamp' },
      actions: { keyPath: 'timestamp' },
    },
  },
};

/** Open (and create if needed) all system databases */
export async function initDatabases() {
  const handles = {};
  for (const [name, config] of Object.entries(DB_CONFIGS)) {
    handles[name] = await openDB(name, config);
  }
  return handles;
}

function openDB(name, config) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, config.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [storeName, opts] of Object.entries(config.stores)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, opts);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
