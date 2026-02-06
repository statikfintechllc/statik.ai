/**
 * file.browser.js – VFS file browser UI
 *
 * Renders a navigable file tree from the VFS
 * and allows opening files in the Monaco editor.
 */

export class FileBrowser {
  constructor(vfs, tree) {
    this.vfs = vfs;
    this.tree = tree;
  }

  /** Render the file tree into a container */
  mount(container) {
    this.container = container;
    // TODO: render tree.toJSON() as expandable list
  }

  /** Handle file selection */
  onSelect(path, callback) {
    // TODO: load file content via vfs.read and invoke callback
    callback(path);
  }

  destroy() {}
}
