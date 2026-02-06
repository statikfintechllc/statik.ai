/**
 * storage.adapter.js – OPFS and quota management for iOS
 *
 * Origin Private File System provides persistent file storage
 * beyond IndexedDB – supports large datasets, VFS backing,
 * and system snapshots.
 */

export class StorageAdapter {
  constructor() {
    this.root = null;
  }

  /** Initialise OPFS root handle */
  async init() {
    if (typeof navigator.storage?.getDirectory !== 'function') return false;
    this.root = await navigator.storage.getDirectory();
    return true;
  }

  /** Write a file to OPFS */
  async writeFile(path, content) {
    if (!this.root) return false;
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    let dir = this.root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
    const file = await dir.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  }

  /** Read a file from OPFS */
  async readFile(path) {
    if (!this.root) return null;
    try {
      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop();
      let dir = this.root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
      }
      const file = await dir.getFileHandle(fileName);
      const blob = await file.getFile();
      return blob.text();
    } catch {
      return null;
    }
  }

  /** Check storage quota */
  async quota() {
    if (!navigator.storage?.estimate) return null;
    return navigator.storage.estimate();
  }
}
