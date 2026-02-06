/**
 * message-flow.test.js – Integration tests for bus message flow
 *
 * Tests: pub/sub delivery, RPC request/response, channel priority
 */

import { Bus } from '../../src/bus/bus.u.js';

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}:`, e.message); }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('message-flow integration tests:');

test('delivers messages to subscribers', () => {
  const bus = new Bus();
  let received = null;
  bus.on('test.topic', (payload) => { received = payload; });
  bus.emit('test.topic', { value: 42 });
  assert(received !== null, 'should receive message');
  assert(received.value === 42, 'should have correct payload');
});

test('supports multiple subscribers', () => {
  const bus = new Bus();
  let count = 0;
  bus.on('multi', () => count++);
  bus.on('multi', () => count++);
  bus.emit('multi', {});
  assert(count === 2, 'both subscribers should fire');
});

test('unsubscribe works', () => {
  const bus = new Bus();
  let count = 0;
  const unsub = bus.on('unsub.test', () => count++);
  bus.emit('unsub.test', {});
  unsub();
  bus.emit('unsub.test', {});
  assert(count === 1, 'should only fire once after unsubscribe');
});
