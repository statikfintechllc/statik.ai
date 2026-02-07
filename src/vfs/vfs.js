import { OPFS } from '../storage/opfs.js';

/**
 * Virtual File System
 * Abstraction for file operations
 */
export default class VFS {
    constructor(bus) {
        this.bus = bus;
        this.adapters = {
            opfs: OPFS
        };
        this.ready = false;
    }

    async init() {
        // Feature detection
        if (navigator.storage && navigator.storage.getDirectory) {
            this.bus.emit('vfs.detected', { type: 'opfs' });
            this.ready = true;
        } else {
            this.bus.emit('vfs.error', { error: 'OPFS not supported' });
        }
    }

    /**
     * Write file to storage
     */
    async write(path, content) {
        if (!this.ready) return false;

        // Emit intent to write 
        // (allows security checks later)
        this.bus.emit('vfs.write', { path, size: content.length });

        const result = await this.adapters.opfs.write(path, content);

        if (result) {
            this.bus.emit('vfs.written', { path });
        }

        return result;
    }

    /**
     * Read file from storage
     */
    async read(path, type = 'text') {
        if (!this.ready) return null;
        return await this.adapters.opfs.read(path, type);
    }

    /**
     * List all files
     */
    async list() {
        if (!this.ready) return [];
        return await this.adapters.opfs.listAll();
    }

    /**
     * Check existence
     */
    async exists(path) {
        if (!this.ready) return false;
        return await this.adapters.opfs.exists(path);
    }
}
