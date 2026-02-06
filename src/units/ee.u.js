/**
 * ee.u.js – Evaluation & Error
 *
 * Compares predicted outcomes against actual outcomes.
 * Emits success/failure signals that drive learning via dbt.u.
 */

export class EvaluationUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ee.u';
  }

  init() {
    this.bus.on('action.completed', (action) => this.evaluate(action));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Compare prediction vs actual outcome */
  evaluate(action) {
    const { prediction, outcome, pattern } = action;
    const match = this._compare(prediction, outcome);

    if (match) {
      this.bus.emit('outcome.success', { actionId: action.id, pattern });
    } else {
      this.bus.emit('outcome.failure', { actionId: action.id, pattern, prediction, outcome });
      this.bus.emit('goal.corrective', { reason: 'prediction_mismatch', actionId: action.id });
    }
  }

  _compare(prediction, outcome) {
    if (!prediction || !outcome) return false;
    return JSON.stringify(prediction) === JSON.stringify(outcome);
  }

  destroy() {}
}
