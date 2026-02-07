/**
 * kernel.test.js – Unit tests for Kernel
 *
 * Tests: init, wake, shutdown, registry loading
 */

import { Kernel } from '../../src/kernel/kernel.u.js';

let _failed = false;
const _tests = [];

function test(name, fn) {
  _tests.push({ name, fn });
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
