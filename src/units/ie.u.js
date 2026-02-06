/**
 * ie.u.js – Intent Execution
 *
 * Executes goals produced by gm.u after validating with ec.u.
 * Records predicted vs actual outcomes for ee.u evaluation.
 */

export class IntentExecutionUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ie.u';
  }

  init() {
    this.bus.on('goal.new', (goal) => this.execute(goal));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Execute a goal */
  async execute(goal) {
    /* Step 1 – validate against ec.u constraints */
    let allowed = true;
    try {
      const verdict = await this.bus.request('ec.validate', goal, 2000);
      allowed = verdict?.allowed !== false;
    } catch (_) {
      /* If ec.u unavailable, allow by default */
    }
    if (!allowed) {
      this.bus.emit('action.blocked', { id: goal.id, reason: 'constraint_violation' });
      return;
    }

    /* Step 2 – predict outcome */
    const prediction = this._predict(goal);

    /* Step 3 – perform action */
    let outcome;
    try {
      outcome = await this._perform(goal);
    } catch (err) {
      outcome = { error: err.message };
    }

    /* Step 4 – report to ee.u */
    this.bus.emit('action.completed', {
      id: goal.id,
      prediction,
      outcome,
      pattern: goal.intent,
    });
  }

  _predict(goal) {
    return { expected: 'success', intent: goal.intent || null };
  }

  async _perform(goal) {
    const type = goal.actionType || 'ui';
    switch (type) {
      case 'ui':
        this.bus.emit('ui.message', { text: goal.response || goal.text || '', sender: 'system', timestamp: Date.now() });
        return { result: 'displayed' };
      case 'storage':
        this.bus.emit('memory.store', goal.data || {});
        return { result: 'stored' };
      case 'network':
        return { result: 'network_not_implemented' };
      default:
        return { result: 'unknown_action_type' };
    }
  }

  destroy() {}
}
