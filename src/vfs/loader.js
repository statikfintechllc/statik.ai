/**
 * loader.js – Dynamic module loading
 *
 * Hot-reloads modified modules from the VFS
 * without requiring a full page refresh.
 */

export class ModuleLoader {
  constructor(vfs) {
    this.vfs = vfs;
    this.loaded = new Map(); // path → module reference
  }

  /** Load a module from VFS (creates a blob URL) */
  async load(path) {
    const source = await this.vfs.read(path);
    if (!source) throw new Error(`Module not found: ${path}`);
    const blob = new Blob([source], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const mod = await import(url);
    this.loaded.set(path, { url, module: mod });
    return mod;
  }

  /** Reload a previously loaded module (revokes old blob URL) */
  async reload(path) {
    const prev = this.loaded.get(path);
    if (prev) {
      URL.revokeObjectURL(prev.url);
      this.loaded.delete(path);
    }
    return this.load(path);
  }
}
