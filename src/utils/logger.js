/**
 * logger.js – Structured logging
 *
 * All log output is structured JSON, stored locally,
 * and never sent externally unless user explicitly exports.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  constructor(unit, minLevel = 'info') {
    this.unit = unit;
    this.minLevel = LEVELS[minLevel] ?? 1;
    this.entries = [];
  }

  debug(msg, data) { this._log('debug', msg, data); }
  info(msg, data)  { this._log('info', msg, data); }
  warn(msg, data)  { this._log('warn', msg, data); }
  error(msg, data) { this._log('error', msg, data); }

  /** Get recent log entries */
  recent(count = 50) {
    return this.entries.slice(-count);
  }

  _log(level, msg, data) {
    if (LEVELS[level] < this.minLevel) return;
    const entry = {
      timestamp: Date.now(),
      level,
      unit: this.unit,
      msg,
      data: data || null,
    };
    this.entries.push(entry);
    if (this.entries.length > 1000) this.entries.shift();
    console[level]?.(`[${this.unit}]`, msg, data ?? '');
  }
}
