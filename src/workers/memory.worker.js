/**
 * memory.worker.js – Database operations off the main thread
 *
 * Responsibilities:
 *   - IndexedDB read/write (won't block UI)
 *   - Memory pruning (hc.u triggers)
 *   - Backup / restore operations
 *   - OPFS file operations
 */

self.addEventListener('message', (e) => {
  const { type, payload, id } = e.data;

  handleMessage(type, payload)
    .then((result) => self.postMessage({ id, type: 'result', payload: result }))
    .catch((err) => self.postMessage({ id, type: 'error', payload: err.message }));
});

async function handleMessage(type, payload) {
  switch (type) {
    case 'store':
      return storeRecord(payload.storeName, payload.record);
    case 'query':
      return queryRecords(payload.storeName, payload.key);
    case 'delete':
      return deleteRecord(payload.storeName, payload.id);
    case 'prune':
      return pruneOldRecords(payload.storeName, payload.maxAge);
    default:
      return null;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('statik_memory', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('episodes')) db.createObjectStore('episodes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('concepts')) db.createObjectStore('concepts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('skills'))   db.createObjectStore('skills', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeRecord(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function queryRecords(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = key
      ? tx.objectStore(storeName).get(key)
      : tx.objectStore(storeName).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function deleteRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function pruneOldRecords(storeName, maxAge) {
  const db = await openDB();
  const cutoff = Date.now() - maxAge;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.openCursor();
    let pruned = 0;
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.timestamp && cursor.value.timestamp < cutoff) {
          cursor.delete();
          pruned++;
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(pruned); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
