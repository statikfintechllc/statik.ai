/**
 * kernel.test.js – Unit tests for Kernel
 *
 * Tests: init, wake, shutdown, registry loading
 */

import { Kernel } from '../../src/kernel/kernel.u.js';

let _failed = false;

function test(name, fn) {
  Promise.resolve().then(fn).then(() => {
    console.log(`  ✓ ${name}`);
  }).catch((e) => {
    console.error(`  ✗ ${name}:`, e.message);
    _failed = true;
  }).finally(() => {
    if (_done) checkDone();
  });
  _pending++;
}

let _pending = 0;
let _done = false;
function checkDone() {
  _pending--;
  if (_pending <= 0 && _failed) process.exitCode = 1;
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('kernel.u tests:');

test('initialises with bus, registry, lifecycle, watchdog', async () => {
  const kernel = new Kernel();
  await kernel.init({});
  assert(kernel.bus !== null, 'bus should be initialised');
  assert(kernel.registry !== null, 'registry should be initialised');
  assert(kernel.lifecycle !== null, 'lifecycle should be initialised');
  assert(kernel.watchdog !== null, 'watchdog should be initialised');
  assert(kernel.state === 'booting', 'state should be booting');
});

test('loads fallback registry when fetch unavailable', async () => {
  const kernel = new Kernel();
  await kernel.init({});
  const order = kernel.registry.bootOrder();
  assert(Array.isArray(order), 'bootOrder should be an array');
  assert(order.length > 0, 'bootOrder should have entries');
  assert(order[0] === 'pce.u', 'first unit should be pce.u');
});

test('shutdown resets state to idle', async () => {
  const kernel = new Kernel();
  await kernel.init({});
  await kernel.shutdown();
  assert(kernel.state === 'idle', 'state should be idle after shutdown');
});

// Signal that all tests have been registered
setTimeout(() => {
  _done = true;
  if (_pending <= 0 && _failed) process.exitCode = 1;
}, 2000);
