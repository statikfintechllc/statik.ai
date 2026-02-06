/**
 * allocator.js – Resource allocation (CPU %, memory)
 *
 * Tracks resource budgets per unit and enforces limits
 * defined in configs/constraints.json.
 */

export class Allocator {
  constructor(constraints) {
    this.constraints = constraints;
    this.budgets = new Map(); // unitId → { cpuMs, memoryMB }
    this.usage = new Map();   // unitId → { cpuMs, memoryMB }
  }

  /** Assign a resource budget to a unit */
  allocate(unitId, budget) {
    this.budgets.set(unitId, { cpuMs: budget.cpuMs || 50, memoryMB: budget.memoryMB || 10 });
    this.usage.set(unitId, { cpuMs: 0, memoryMB: 0 });
  }

  /** Record resource usage for a unit */
  record(unitId, used) {
    const current = this.usage.get(unitId);
    if (!current) return;
    if (used.cpuMs) current.cpuMs += used.cpuMs;
    if (used.memoryMB) current.memoryMB = used.memoryMB;
  }

  /** Check whether a unit has exceeded its budget */
  isOverBudget(unitId) {
    const budget = this.budgets.get(unitId);
    const used = this.usage.get(unitId);
    if (!budget || !used) return false;
    return used.cpuMs > budget.cpuMs || used.memoryMB > budget.memoryMB;
  }

  /** Reset usage counters (called periodically) */
  resetCycle() {
    for (const [id] of this.usage) {
      this.usage.set(id, { cpuMs: 0, memoryMB: 0 });
    }
  }
}
