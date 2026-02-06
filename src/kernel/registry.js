/**
 * registry.js – Unit registration and lookup
 *
 * Maintains the manifest of all cognitive units,
 * their dependencies, and the boot order.
 */

export class Registry {
  constructor() {
    this.units = new Map();
    this._bootOrder = [];
  }

  /** Load unit manifest from a parsed JSON object */
  load(manifest) {
    for (const entry of manifest.units) {
      this.units.set(entry.id, entry);
    }
    this._bootOrder = manifest.bootOrder || [];
  }

  /** Return the ordered list of unit IDs for booting */
  bootOrder() {
    return this._bootOrder;
  }

  /** Look up a unit descriptor by ID */
  get(unitId) {
    return this.units.get(unitId) || null;
  }

  /** List all registered unit IDs */
  list() {
    return [...this.units.keys()];
  }
}
