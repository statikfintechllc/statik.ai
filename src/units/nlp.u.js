/**
 * nlp.u.js – Natural Language Processor
 *
 * Rule-based parsing and template-based generation.
 * No LLM – grows via pattern library managed by dbt.u.
 *
 * Parsing:  tokenise → POS tag → dependency → intent → entities
 * Compose:  select template → fill slots → grammar → surface
 */

export class NLPUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'nlp.u';
    this.templates = new Map();
  }

  init() {
    this._loadDefaultTemplates();
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Parse raw text into structured intent */
  parse(text) {
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    const entities = this._extractEntities(text);
    return { tokens, entities, raw: text };
  }

  /** Compose a response from a template */
  compose(templateId, slots = {}) {
    const tpl = this.templates.get(templateId);
    if (!tpl) return `[no template: ${templateId}]`;
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => slots[key] ?? `[${key}]`);
  }

  _extractEntities(text) {
    const entities = [];
    const numbers = text.match(/\b\d+(\.\d+)?\b/g);
    if (numbers) entities.push(...numbers.map((n) => ({ type: 'number', value: n })));
    return entities;
  }

  _loadDefaultTemplates() {
    this.templates.set('greeting', 'Hello! How can I help?');
    this.templates.set('acknowledge', 'Got it – {{summary}}.');
    this.templates.set('error', 'Something went wrong: {{message}}');
    this.templates.set('capability_deny', "I can't do that – {{reason}}.");
  }

  destroy() {}
}
