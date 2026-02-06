/**
 * cm.test.js – Unit tests for Core Memory
 *
 * Tests: store, query, forget
 */

import { CoreMemoryUnit } from '../../src/units/cm.u.js';
import { Bus } from '../../src/bus/bus.u.js';

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}:`, e.message); }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('cm.u tests:');

test('stores a context as episodic memory', () => {
  const bus = new Bus();
  const cm = new CoreMemoryUnit(bus);
  const record = cm.store({ tokens: ['hello'], salience: 0.8 });
  assert(record.id, 'should have an id');
  assert(record.kind === 'episodic', 'should be episodic');
});

test('queries memories by keyword', () => {
  const bus = new Bus();
  const cm = new CoreMemoryUnit(bus);
  cm.store({ tokens: ['balance', 'check'], salience: 0.9 });
  cm.store({ tokens: ['weather', 'today'], salience: 0.5 });
  const results = cm.query(['balance']);
  assert(results.length === 1, 'should find 1 match');
});

test('forgets a memory by id', () => {
  const bus = new Bus();
  const cm = new CoreMemoryUnit(bus);
  const record = cm.store({ tokens: ['test'], salience: 0.5 });
  cm.forget(record.id);
  const results = cm.query(['test']);
  assert(results.length === 0, 'should find 0 after forget');
});
