/**
 * CSA.OS - Storage Manager
 * Unified storage interface for OPFS, IndexedDB, and Cache API
 * Provides system-level storage access for agents
 */

class StorageManager {
    constructor() {
        this.opfsRoot = null;
        this.db = null;
        this.dbName = 'CSA_OS_DB';
        this.dbVersion = 1;
        this.initialized = false;
    }

    async initialize() {
        await this.initializeOPFS();
        await this.initializeIndexedDB();
        this.initialized = true;
    }

    async initializeOPFS() {
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
            console.warn('[Storage] OPFS not available');
            return;
        }

        try {
            this.opfsRoot = await navigator.storage.getDirectory();
            console.log('[Storage] OPFS initialized');
        } catch (error) {
            console.error('[Storage] OPFS initialization failed:', error);
        }
    }

    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('[Storage] IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Agent store
                if (!db.objectStoreNames.contains('agents')) {
                    const agentStore = db.createObjectStore('agents', { keyPath: 'id' });
                    agentStore.createIndex('status', 'status', { unique: false });
                    agentStore.createIndex('created', 'created', { unique: false });
                }

                // State store
                if (!db.objectStoreNames.contains('state')) {
                    db.createObjectStore('state', { keyPath: 'key' });
                }

                // Memory store for agent memory
                if (!db.objectStoreNames.contains('memory')) {
                    const memStore = db.createObjectStore('memory', { keyPath: 'id', autoIncrement: true });
                    memStore.createIndex('agentId', 'agentId', { unique: false });
                    memStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Task queue
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                }

                console.log('[Storage] IndexedDB schema created');
            };
        });
    }

    // OPFS File Operations
    async writeFile(path, data) {
        if (!this.opfsRoot) throw new Error('OPFS not available');

        const pathParts = path.split('/').filter(p => p);
        const fileName = pathParts.pop();
        
        let dir = this.opfsRoot;
        for (const part of pathParts) {
            dir = await dir.getDirectoryHandle(part, { create: true });
        }

        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
    }

    async readFile(path) {
        if (!this.opfsRoot) throw new Error('OPFS not available');

        const pathParts = path.split('/').filter(p => p);
        const fileName = pathParts.pop();
        
        let dir = this.opfsRoot;
        for (const part of pathParts) {
            dir = await dir.getDirectoryHandle(part);
        }

        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
    }

    async deleteFile(path) {
        if (!this.opfsRoot) throw new Error('OPFS not available');

        const pathParts = path.split('/').filter(p => p);
        const fileName = pathParts.pop();
        
        let dir = this.opfsRoot;
        for (const part of pathParts) {
            dir = await dir.getDirectoryHandle(part);
        }

        await dir.removeEntry(fileName);
    }

    async listFiles(path = '') {
        if (!this.opfsRoot) throw new Error('OPFS not available');

        let dir = this.opfsRoot;
        if (path) {
            const pathParts = path.split('/').filter(p => p);
            for (const part of pathParts) {
                dir = await dir.getDirectoryHandle(part);
            }
        }

        const entries = [];
        for await (const entry of dir.values()) {
            entries.push({
                name: entry.name,
                kind: entry.kind,
                isDirectory: entry.kind === 'directory',
                isFile: entry.kind === 'file'
            });
        }
        return entries;
    }

    // IndexedDB Operations
    async set(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async query(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Agent-specific operations
    async saveAgent(agent) {
        return this.set('agents', agent);
    }

    async getAgent(id) {
        return this.get('agents', id);
    }

    async getAllAgents() {
        return this.getAll('agents');
    }

    async deleteAgent(id) {
        return this.delete('agents', id);
    }

    async saveState(key, value) {
        return this.set('state', { key, value, updated: Date.now() });
    }

    async getState(key) {
        const result = await this.get('state', key);
        return result ? result.value : null;
    }

    async saveMemory(agentId, data) {
        return this.set('memory', {
            agentId,
            data,
            timestamp: Date.now()
        });
    }

    async getAgentMemories(agentId) {
        return this.query('memory', 'agentId', agentId);
    }

    async addTask(task) {
        return this.set('tasks', {
            ...task,
            status: task.status || 'pending',
            priority: task.priority || 5,
            created: Date.now()
        });
    }

    async getTask(id) {
        return this.get('tasks', id);
    }

    async getPendingTasks() {
        return this.query('tasks', 'status', 'pending');
    }

    // Storage stats
    async getStats() {
        if (!('storage' in navigator && 'estimate' in navigator.storage)) {
            return null;
        }

        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            usagePercentage: (estimate.usage / estimate.quota * 100).toFixed(2),
            usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
            quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2),
            usageGB: (estimate.usage / (1024 ** 3)).toFixed(2),
            quotaGB: (estimate.quota / (1024 ** 3)).toFixed(2)
        };
    }
}

const storage = new StorageManager();

export default storage;
export { StorageManager };
