/**
 * opfs.js – Origin Private File System helpers
 *
 * High-level API over the browser OPFS for:
 *   - Snapshot storage
 *   - Dataset persistence
 *   - VFS backing store
 */

export class OPFS {
  constructor() {
    this.root = null;
  }

  /** Check if OPFS is available and obtain root handle */
  async init() {
    if (typeof navigator.storage?.getDirectory !== 'function') return false;
    this.root = await navigator.storage.getDirectory();
    return true;
  }

  /** Write text to a file (creates parent dirs) */
  async write(path, content) {
    if (!this.root) return false;
    const dir = await this._ensureDir(path);
    const fileName = path.split('/').filter(Boolean).pop();
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
    return true;
  }

  /** Read text from a file */
  async read(path) {
    if (!this.root) return null;
    try {
      const dir = await this._navigateDir(path);
      const fileName = path.split('/').filter(Boolean).pop();
      const fh = await dir.getFileHandle(fileName);
      const file = await fh.getFile();
      return file.text();
    } catch {
      return null;
    }
  }

  /** List entries in a directory */
  async list(dirPath = '/') {
    if (!this.root) return [];
    const dir = dirPath === '/' ? this.root : await this._navigateDir(dirPath + '/_');
    const entries = [];
    for await (const [name, handle] of dir) {
      entries.push({ name, kind: handle.kind });
    }
    return entries;
  }

  /* ── internal ──────────────────────────────────────── */

  async _ensureDir(path) {
    const parts = path.split('/').filter(Boolean);
    parts.pop(); // remove filename
    let dir = this.root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
    return dir;
  }

  async _navigateDir(path) {
    const parts = path.split('/').filter(Boolean);
    parts.pop(); // remove filename
    let dir = this.root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    return dir;
  }
}
