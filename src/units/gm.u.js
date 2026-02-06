/**
 * gm.u.js – Goals & Motivation
 *
 * Generates and prioritises goals from context and system state.
 * Goal types: reactive, homeostatic, exploratory, meta.
 */

export class GoalsUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'gm.u';
    this.goalStack = [];
    this.maxDepth = 5;
  }

  init() {
    this.bus.on('context.temporal', (ctx) => this.onContext(ctx));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** React to temporal context – may generate goals */
  onContext(ctx) {
    const goal = {
      id: `goal_${Date.now()}`,
      type: 'reactive',
      source: ctx.id,
      intent: ctx.intent,
      priority: ctx.salience || 0.5,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.goalStack.push(goal);
    if (this.goalStack.length > this.maxDepth) this.goalStack.shift();
    this.goalStack.sort((a, b) => b.priority - a.priority);

    this.bus.emit('goal.new', goal);
  }

  /** Get the current top goal */
  currentGoal() {
    return this.goalStack[0] || null;
  }

  destroy() {}
}
