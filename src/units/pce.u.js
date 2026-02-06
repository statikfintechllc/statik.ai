/**
 * pce.u.js – Perception & Context Encoder
 *
 * Normalises raw inputs (text, DOM events, sensors, time)
 * into ContextFrame objects and emits them on the bus.
 *
 * Pipeline: raw input → tokenise → tag intent → score novelty → emit
 */

import { shortId } from '../utils/id.js';

export class PerceptionUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'pce.u';
    this.recentHashes = new Set();
  }

  init() {
    this.bus.on('user.input', (msg) => {
      if (msg && msg.text) this.encode(msg.text);
    });
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Process a raw text input into a ContextFrame */
  encode(text) {
    const tokens = this._tokenise(text);
    const intent = this._classifyIntent(tokens);
    const novelty = this._scoreNovelty(tokens);

    const frame = {
      id: `ctx_${shortId()}`,
      timestamp: Date.now(),
      source: this.id,
      tokens,
      intent,
      novelty,
      urgency: 1.0, // user-initiated = high
      metadata: { raw: text },
    };

    this.bus.emit('context.frame', frame);
    return frame;
  }

  _tokenise(text) {
    return text.toLowerCase().split(/\s+/).filter(Boolean);
  }

  _classifyIntent(tokens) {
    if (tokens.some((t) => t.endsWith('?'))) return 'query';
    const commands = ['show', 'get', 'set', 'do', 'run', 'start', 'stop', 'reset'];
    if (commands.includes(tokens[0])) return 'command';
    return 'statement';
  }

  _scoreNovelty(tokens) {
    const hash = tokens.join('|');
    if (this.recentHashes.has(hash)) return 0;
    this.recentHashes.add(hash);
    if (this.recentHashes.size > 100) {
      const first = this.recentHashes.values().next().value;
      this.recentHashes.delete(first);
    }
    return 1.0;
  }

  destroy() {}
}
