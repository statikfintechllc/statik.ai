/**
 * bus.test.js – Unit tests for Bus pub/sub system
 *
 * Tests: emit, on/off, wildcard, request/reply, history
 */

import { Bus } from '../../src/bus/bus.u.js';

let _failed = false;
const _tests = [];

function test(name, fn) {
  _tests.push({ name, fn });
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('bus.u tests:');

test('emits and receives messages', () => {
  const bus = new Bus();
  let received = null;
  bus.on('test', (payload) => { received = payload; });
  bus.emit('test', { value: 1 });
  assert(received !== null, 'should receive');
  assert(received.value === 1, 'payload correct');
});

test('wildcard subscriber receives all messages', () => {
  const bus = new Bus();
  const msgs = [];
  bus.on('*', (payload, msg) => { msgs.push(msg.topic); });
  bus.emit('a', {});
  bus.emit('b', {});
  assert(msgs.length === 2, 'should receive 2 messages');
  assert(msgs[0] === 'a', 'first should be a');
  assert(msgs[1] === 'b', 'second should be b');
});

test('off removes subscriber', () => {
  const bus = new Bus();
  let count = 0;
  const handler = () => count++;
  bus.on('x', handler);
  bus.emit('x', {});
  bus.off('x', handler);
  bus.emit('x', {});
  assert(count === 1, 'should only fire once');
});

test('on returns unsubscribe function', () => {
  const bus = new Bus();
  let count = 0;
  const unsub = bus.on('y', () => count++);
  bus.emit('y', {});
  unsub();
  bus.emit('y', {});
  assert(count === 1, 'should only fire once via unsub');
});

test('history records messages', () => {
  const bus = new Bus();
  bus.emit('h1', { a: 1 });
  bus.emit('h2', { b: 2 });
  assert(bus.history.length === 2, 'should have 2 history entries');
  assert(bus.history[0].topic === 'h1', 'first should be h1');
});

test('history caps at maxHistory', () => {
  const bus = new Bus();
  bus.maxHistory = 5;
  for (let i = 0; i < 10; i++) bus.emit('t', { i });
  assert(bus.history.length === 5, 'should cap at 5');
});

test('request/reply resolves', async () => {
  const bus = new Bus();
  bus.on('rpc.test', (payload) => {
    bus.emit(payload._replyTo, { answer: 42 });
  });
  const result = await bus.request('rpc.test', { q: 'meaning' }, 1000);
  assert(result.answer === 42, 'should get answer 42');
});

test('request timeout rejects', async () => {
  const bus = new Bus();
  try {
    await bus.request('no.reply', {}, 100);
    assert(false, 'should have thrown');
  } catch (e) {
    assert(e.message.includes('timeout'), 'should be timeout error');
  }
});

/* Run all tests sequentially, awaiting async ones */
(async () => {
  for (const { name, fn } of _tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (e) {
      console.error(`  ✗ ${name}:`, e.message);
      _failed = true;
    }
  }
  if (_failed) process.exitCode = 1;
})();
