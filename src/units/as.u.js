/**
 * as.u.js – Attention & Salience
 *
 * Filters incoming ContextFrames by scoring them on:
 *   novelty, urgency, goal-alignment, resource cost
 * Only the top-N frames proceed to downstream units.
 */

export class AttentionUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'as.u';
    this.windowSize = 10;
    this.window = [];
  }

  init() {
    this.bus.on('context.frame', (frame) => this.evaluate(frame));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Score and filter a ContextFrame */
  evaluate(frame) {
    const score = this._score(frame);
    if (score < 0.2) return; // drop low-salience frames

    this.window.push({ ...frame, salience: score });
    if (this.window.length > this.windowSize) this.window.shift();

    this.bus.emit('context.salient', { ...frame, salience: score });
  }

  _score(frame) {
    return (frame.novelty * 0.4) + (frame.urgency * 0.4) + 0.2;
  }

  destroy() {}
}
