/**
 * tree.js – Directory tree management
 *
 * Builds and maintains an in-memory representation of
 * the VFS file tree for the editor and snapshot system.
 */

export class FileTree {
  constructor() {
    this.root = { name: '/', type: 'dir', children: [] };
  }

  /** Add a file path to the tree */
  add(path) {
    const parts = path.split('/').filter(Boolean);
    let node = this.root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      let child = node.children.find((c) => c.name === name);
      if (!child) {
        child = { name, type: isFile ? 'file' : 'dir', children: [] };
        node.children.push(child);
      }
      node = child;
    }
  }

  /** Get a flat list of all file paths */
  flatten(node = this.root, prefix = '') {
    const paths = [];
    for (const child of node.children) {
      const childPath = prefix ? `${prefix}/${child.name}` : child.name;
      if (child.type === 'file') {
        paths.push(childPath);
      } else {
        paths.push(...this.flatten(child, childPath));
      }
    }
    return paths;
  }

  /** Serialise the tree to JSON */
  toJSON() {
    return JSON.parse(JSON.stringify(this.root));
  }
}
