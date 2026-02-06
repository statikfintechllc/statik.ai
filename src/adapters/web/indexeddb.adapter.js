/**
 * indexeddb.adapter.js – IndexedDB storage abstraction
 *
 * Wraps raw IndexedDB API into a simpler async interface
 * used by storage/db.js and the memory worker.
 */

export class IndexedDBAdapter {
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  /** Open the database */
  async open(upgradeCallback) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        if (upgradeCallback) upgradeCallback(e.target.result);
      };
      req.onsuccess = () => { this.db = req.result; resolve(this.db); };
      req.onerror = () => reject(req.error);
    });
  }

  /** Put a record into a store */
  async put(storeName, record) {
    return this._tx(storeName, 'readwrite', (store) => store.put(record));
  }

  /** Get a record by key */
  async get(storeName, key) {
    return this._tx(storeName, 'readonly', (store) => store.get(key));
  }

  /** Get all records from a store */
  async getAll(storeName) {
    return this._tx(storeName, 'readonly', (store) => store.getAll());
  }

  /** Delete a record by key */
  async delete(storeName, key) {
    return this._tx(storeName, 'readwrite', (store) => store.delete(key));
  }

  /** Close the database */
  close() {
    if (this.db) this.db.close();
    this.db = null;
  }

  /* ── internal ──────────────────────────────────────── */

  _tx(storeName, mode, action) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const req = action(tx.objectStore(storeName));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
