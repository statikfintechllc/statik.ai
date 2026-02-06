/**
 * backup.js – Export / import system state
 *
 * Generates and restores JSON snapshots of all databases
 * for backup, transfer, and sfti.iso generation.
 */

/** Export all IndexedDB data as a JSON-serialisable object */
export async function exportState() {
  const snapshot = {
    version: '0.1.0',
    timestamp: Date.now(),
    databases: {},
  };

  const dbNames = ['statik_memory', 'statik_state', 'statik_logs'];

  for (const name of dbNames) {
    snapshot.databases[name] = await exportDatabase(name);
  }

  return snapshot;
}

/** Import a previously exported snapshot */
export async function importState(snapshot) {
  if (!snapshot?.databases) throw new Error('Invalid snapshot format');

  for (const [name, data] of Object.entries(snapshot.databases)) {
    await importDatabase(name, data);
  }
}

async function exportDatabase(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = [...db.objectStoreNames];
      const result = {};
      if (storeNames.length === 0) { db.close(); return resolve(result); }

      const tx = db.transaction(storeNames, 'readonly');
      let remaining = storeNames.length;

      for (const storeName of storeNames) {
        const getAll = tx.objectStore(storeName).getAll();
        getAll.onsuccess = () => {
          result[storeName] = getAll.result;
          if (--remaining === 0) { db.close(); resolve(result); }
        };
      }
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

async function importDatabase(name, data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Object.keys(data).filter((s) => db.objectStoreNames.contains(s));
      if (storeNames.length === 0) { db.close(); return resolve(); }

      const tx = db.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) {
        const store = tx.objectStore(storeName);
        for (const record of data[storeName]) {
          store.put(record);
        }
      }
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
