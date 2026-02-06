/**
 * nlp.test.js – Unit tests for Natural Language Processor
 *
 * Tests: parsing, entity extraction, template composition
 */

import { NLPUnit } from '../../src/units/nlp.u.js';
import { Bus } from '../../src/bus/bus.u.js';

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}:`, e.message); }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('nlp.u tests:');

test('parses text into tokens', () => {
  const nlp = new NLPUnit(new Bus());
  nlp.init();
  const result = nlp.parse('Hello World');
  assert(Array.isArray(result.tokens), 'should return tokens array');
  assert(result.tokens.length === 2, 'should have 2 tokens');
});

test('extracts number entities', () => {
  const nlp = new NLPUnit(new Bus());
  nlp.init();
  const result = nlp.parse('Buy 100 shares at 42.50');
  assert(result.entities.length === 2, 'should find 2 numbers');
});

test('composes from templates', () => {
  const nlp = new NLPUnit(new Bus());
  nlp.init();
  const msg = nlp.compose('acknowledge', { summary: 'task done' });
  assert(msg === 'Got it – task done.', 'should fill template slots');
});

test('handles missing template gracefully', () => {
  const nlp = new NLPUnit(new Bus());
  nlp.init();
  const msg = nlp.compose('nonexistent');
  assert(msg.includes('no template'), 'should return fallback');
});
