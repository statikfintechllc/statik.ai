/**
 * snapshot.js – System state snapshots (sfti.iso generation)
 *
 * Bundles the full source tree + state + config into a
 * single JSON blob that can reconstruct the entire system.
 */

import { exportState } from '../storage/backup.js';

export class SnapshotManager {
  constructor(vfs, tree) {
    this.vfs = vfs;
    this.tree = tree;
  }

  /** Generate a full system snapshot */
  async create() {
    const files = this.tree.flatten();
    const source = {};

    for (const path of files) {
      source[path] = await this.vfs.read(path);
    }

    const state = await exportState();

    return {
      meta: {
        version: '0.1.0',
        created: new Date().toISOString(),
      },
      source,
      state: state.databases,
      config: {},
    };
  }

  /** Restore system from a snapshot */
  async restore(snapshot) {
    if (!snapshot?.source) throw new Error('Invalid snapshot');

    /* Restore source files to VFS */
    for (const [path, content] of Object.entries(snapshot.source)) {
      await this.vfs.write(path, content);
    }

    /* Restore state databases */
    if (snapshot.state && typeof indexedDB !== 'undefined') {
      for (const [dbName, stores] of Object.entries(snapshot.state)) {
        await this._restoreDB(dbName, stores);
      }
    }

    /* Restore config (re-write to VFS) */
    if (snapshot.config) {
      for (const [key, value] of Object.entries(snapshot.config)) {
        await this.vfs.write(`configs/${key}.json`, JSON.stringify(value, null, 2));
      }
    }
  }

  /** Restore a single IndexedDB database from snapshot data */
  async _restoreDB(name, stores) {
    /* Use backup.js importState if available, otherwise write directly into existing stores */
    return new Promise((resolve) => {
      /* Open without version bump – do not recreate stores with wrong schemas */
      const req = indexedDB.open(name);
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const db = req.result;
        try {
          for (const [storeName, records] of Object.entries(stores)) {
            if (!db.objectStoreNames.contains(storeName)) continue;
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            for (const record of records) {
              store.put(record);
            }
          }
        } catch (_) { /* best-effort */ }
        db.close();
        resolve();
      };
    });
  }
}
