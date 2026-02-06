/**
 * snapshot.js – System state snapshots (sfti.iso generation)
 *
 * Bundles the full source tree + state + config into a
 * single JSON blob that can reconstruct the entire system.
 */

import { exportState } from '../storage/backup.js';

export class SnapshotManager {
  constructor(vfs, tree) {
    this.vfs = vfs;
    this.tree = tree;
  }

  /** Generate a full system snapshot */
  async create() {
    const files = this.tree.flatten();
    const source = {};

    for (const path of files) {
      source[path] = await this.vfs.read(path);
    }

    const state = await exportState();

    return {
      meta: {
        version: '0.1.0',
        created: new Date().toISOString(),
      },
      source,
      state: state.databases,
      config: {},
    };
  }

  /** Restore system from a snapshot */
  async restore(snapshot) {
    if (!snapshot?.source) throw new Error('Invalid snapshot');

    // Restore source files
    for (const [path, content] of Object.entries(snapshot.source)) {
      await this.vfs.write(path, content);
    }

    // TODO: restore state databases
    // TODO: restore config
  }
}
