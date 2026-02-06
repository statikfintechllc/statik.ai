/**
 * pce.test.js – Unit tests for Perception & Context Encoder
 *
 * Tests: tokenisation, intent classification, novelty scoring
 */

import { PerceptionUnit } from '../../src/units/pce.u.js';
import { Bus } from '../../src/bus/bus.u.js';

// TODO: replace with test runner of choice (e.g. native Node test runner)

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}:`, e.message); }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('pce.u tests:');

test('encodes text into a ContextFrame', () => {
  const bus = new Bus();
  const pce = new PerceptionUnit(bus);
  const frame = pce.encode('hello world');
  assert(frame.id, 'should have an id');
  assert(Array.isArray(frame.tokens), 'tokens should be an array');
  assert(frame.tokens.length === 2, 'should have 2 tokens');
  assert(frame.intent === 'statement', 'should classify as statement');
});

test('classifies questions as queries', () => {
  const bus = new Bus();
  const pce = new PerceptionUnit(bus);
  const frame = pce.encode('what is my balance?');
  assert(frame.intent === 'query', 'should classify as query');
});

test('classifies commands', () => {
  const bus = new Bus();
  const pce = new PerceptionUnit(bus);
  const frame = pce.encode('show my portfolio');
  assert(frame.intent === 'command', 'should classify as command');
});

test('scores novelty for new inputs', () => {
  const bus = new Bus();
  const pce = new PerceptionUnit(bus);
  const frame1 = pce.encode('first input');
  assert(frame1.novelty === 1.0, 'first input should be novel');
  const frame2 = pce.encode('first input');
  assert(frame2.novelty === 0, 'duplicate should not be novel');
});
