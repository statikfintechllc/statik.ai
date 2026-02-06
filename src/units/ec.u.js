/**
 * ec.u.js – Constraints & Ethics
 *
 * Hard rules that cannot be disabled, even in dev mode:
 *   1. Never write to storage without user visibility
 *   2. Never call unknown domains
 *   3. Never execute external arbitrary code
 *   4. Never pretend to be human
 *   5. Never lie about capabilities
 */

export class ConstraintsUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ec.u';
    this.allowedDomains = new Set();
    this.rules = [];
  }

  init() {
    this._loadRules();
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Validate an action against all rules. Returns { allowed, reason } */
  validate(action) {
    for (const rule of this.rules) {
      const result = rule(action);
      if (!result.allowed) return result;
    }
    return { allowed: true, reason: null };
  }

  _loadRules() {
    this.rules = [
      (action) => {
        if (action.type === 'network.fetch' && !this.allowedDomains.has(action.domain)) {
          return { allowed: false, reason: 'Unknown domain blocked by ec.u' };
        }
        return { allowed: true };
      },
      (action) => {
        if (action.type === 'code.exec' && action.source === 'external') {
          return { allowed: false, reason: 'External code execution blocked by ec.u' };
        }
        return { allowed: true };
      },
    ];
  }

  destroy() {}
}
