/**
 * lifecycle.test.js – Unit tests for Lifecycle management
 *
 * Tests: start, stop, restart, wakeAll, shutdownAll
 */

import { Lifecycle } from '../../src/kernel/lifecycle.js';
import { Registry } from '../../src/kernel/registry.js';
import { Bus } from '../../src/bus/bus.u.js';

let _failed = false;
const _tests = [];

function test(name, fn) {
  _tests.push({ name, fn });
}

let _count = 0;

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('lifecycle tests:');

test('starts a known unit', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [{ id: 'ec.u' }], bootOrder: ['ec.u'] });
  const lifecycle = new Lifecycle(bus, registry);
  await lifecycle.start('ec.u');
  assert(lifecycle.running.has('ec.u'), 'ec.u should be running');
  assert(lifecycle.instances.has('ec.u'), 'ec.u instance should exist');
});

test('stops a running unit', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [{ id: 'ec.u' }], bootOrder: ['ec.u'] });
  const lifecycle = new Lifecycle(bus, registry);
  await lifecycle.start('ec.u');
  await lifecycle.stop('ec.u');
  assert(!lifecycle.running.has('ec.u'), 'ec.u should not be running');
  assert(!lifecycle.instances.has('ec.u'), 'ec.u instance should be gone');
});

test('wakeAll starts units in order', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [{ id: 'ec.u' }, { id: 'sa.u' }], bootOrder: ['ec.u', 'sa.u'] });
  const lifecycle = new Lifecycle(bus, registry);
  const started = [];
  bus.on('unit.started', (msg) => started.push(msg.unitId));
  await lifecycle.wakeAll();
  assert(started[0] === 'ec.u', 'ec.u should start first');
  assert(started[1] === 'sa.u', 'sa.u should start second');
});

test('shutdownAll stops in reverse order', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [{ id: 'ec.u' }, { id: 'sa.u' }], bootOrder: ['ec.u', 'sa.u'] });
  const lifecycle = new Lifecycle(bus, registry);
  await lifecycle.wakeAll();
  const stopped = [];
  bus.on('unit.stopped', (msg) => stopped.push(msg.unitId));
  await lifecycle.shutdownAll();
  assert(stopped[0] === 'sa.u', 'sa.u should stop first (reverse order)');
  assert(stopped[1] === 'ec.u', 'ec.u should stop second');
});

test('handles unknown unit gracefully', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [], bootOrder: [] });
  const lifecycle = new Lifecycle(bus, registry);
  await lifecycle.start('nonexistent.u');
  assert(!lifecycle.running.has('nonexistent.u'), 'should not be running');
});

test('get returns running instance', async () => {
  const bus = new Bus();
  const registry = new Registry();
  registry.load({ units: [{ id: 'ec.u' }], bootOrder: ['ec.u'] });
  const lifecycle = new Lifecycle(bus, registry);
  await lifecycle.start('ec.u');
  const inst = lifecycle.get('ec.u');
  assert(inst !== null, 'should return instance');
  assert(typeof inst.init === 'function', 'instance should have init method');
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
