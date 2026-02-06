/**
 * vfs.js – Virtual File System abstraction
 *
 * Allows the system to read/write its own source code.
 * Backed by OPFS for persistence, with in-memory cache.
 */

export class VFS {
  constructor(opfs) {
    this.opfs = opfs;
    this.cache = new Map(); // path → content
  }

  /** Read a file (cache first, then OPFS, then network) */
  async read(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    const content = await this.opfs.read(path);
    if (content !== null) {
      this.cache.set(path, content);
      return content;
    }
    // Fallback: fetch from network
    try {
      const resp = await fetch(path);
      if (resp.ok) {
        const text = await resp.text();
        this.cache.set(path, text);
        return text;
      }
    } catch { /* offline */ }
    return null;
  }

  /** Write a file (OPFS + cache) */
  async write(path, content) {
    this.cache.set(path, content);
    return this.opfs.write(path, content);
  }

  /** Check if a file exists (cache and OPFS only, no network fetch) */
  async exists(path) {
    if (this.cache.has(path)) return true;
    const content = await this.opfs.read(path);
    if (content !== null) {
      this.cache.set(path, content);
      return true;
    }
    return false;
  }

  /** List files in a directory */
  async list(dirPath) {
    return this.opfs.list(dirPath);
  }
}
