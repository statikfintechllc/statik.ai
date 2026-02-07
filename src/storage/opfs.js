/**
 * OPFS Adapter
 * Wraps the Origin Private File System API for persistent local storage
 */

export const OPFS = {
    // Cache the root handle
    _root: null,

    async getRoot() {
        if (!this._root) {
            this._root = await navigator.storage.getDirectory();
        }
        return this._root;
    },

    /**
     * Parse path string into parts
     * "src/units/test.js" -> ["src", "units", "test.js"]
     */
    _parsePath(path) {
        return path.split('/').filter(p => p.length > 0);
    },

    /**
     * Get handle for a specific file, creating directories if needed
     */
    async getFileHandle(path, create = false) {
        const parts = this._parsePath(path);
        const filename = parts.pop();
        let currentDir = await this.getRoot();

        // Traverse/create directories
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part, { create });
        }

        return await currentDir.getFileHandle(filename, { create });
    },

    /**
     * Write content to a file
     * @param {string} path 
     * @param {string|Blob|BufferSource} content 
     */
    async write(path, content) {
        try {
            const fileHandle = await this.getFileHandle(path, true);
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (e) {
            console.error(`OPFS Write Error (${path}):`, e);
            throw e;
        }
    },

    /**
     * Read file content
     * @param {string} path 
     * @param {string} type - 'text', 'json', 'blob', 'arrayBuffer'
     */
    async read(path, type = 'text') {
        try {
            const fileHandle = await this.getFileHandle(path);
            const file = await fileHandle.getFile();

            if (type === 'text') return await file.text();
            if (type === 'json') return JSON.parse(await file.text());
            if (type === 'arrayBuffer') return await file.arrayBuffer();
            return file; // Blob
        } catch (e) {
            console.warn(`OPFS Read Error (${path}):`, e);
            return null; // File not found or readable
        }
    },

    /**
     * Check if file exists
     */
    async exists(path) {
        try {
            await this.getFileHandle(path);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Delete a file
     */
    async delete(path) {
        try {
            const parts = this._parsePath(path);
            const filename = parts.pop();
            let currentDir = await this.getRoot();

            for (const part of parts) {
                currentDir = await currentDir.getDirectoryHandle(part);
            }

            await currentDir.removeEntry(filename);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * List all files (recursive)
     * Returns array of paths
     */
    async listAll(dirHandle = null, basePath = '') {
        const root = dirHandle || await this.getRoot();
        let files = [];

        for await (const [name, handle] of root.entries()) {
            const currentPath = basePath ? `${basePath}/${name}` : name;

            if (handle.kind === 'file') {
                files.push(currentPath);
            } else if (handle.kind === 'directory') {
                const subFiles = await this.listAll(handle, currentPath);
                files = files.concat(subFiles);
            }
        }

        return files;
    }
};
