/**
 * Simple usage wrapper around IndexedDB
 * Implementation of statik_memory, statik_state, statik_logs
 */

export class StorageDB {
    constructor() {
        this.dbName = 'statik.ai_v1';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = (event) => {
                console.error("StorageDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("StorageDB opened successfully");
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // statik_memory
                if (!db.objectStoreNames.contains('episodes')) {
                    const eps = db.createObjectStore('episodes', { keyPath: 'id' });
                    eps.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('concepts')) {
                    db.createObjectStore('concepts', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('skills')) {
                    db.createObjectStore('skills', { keyPath: 'id' });
                }

                // statik_state
                if (!db.objectStoreNames.contains('unit_states')) {
                    db.createObjectStore('unit_states', { keyPath: 'unit_id' });
                }

                // statik_logs
                if (!db.objectStoreNames.contains('logs')) {
                    const logs = db.createObjectStore('logs', { keyPath: 'timestamp' });
                }
            };
        });
    }
}
