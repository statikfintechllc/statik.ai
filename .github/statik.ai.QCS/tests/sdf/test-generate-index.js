#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Test: generate-sdf-index.js
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const assert = require('assert');
const path   = require('path');

// Import from scripts (tests/sdf/ → ../../scripts/)
const {
  FILE_MAPPINGS,
  SDF_DOCS,
  DOC_META,
  KNOWN_ISSUES,
  REPO_ROOT,
  SDF_ROOT,
} = require('../../scripts/generate-sdf-index.js');

const EXPECTED_DOC_COUNT      = 22;
const MIN_FILE_MAPPINGS       = 100; // At least 100 of the 113 mapped
const EXPECTED_KNOWN_ISSUES   = 17;

const EXPECTED_LAYERS = [
  'root', 'bootstrap', 'config', 'schema', 'kernel', 'bus',
  'runtime', 'units', 'workers', 'adapters', 'storage', 'vfs',
  'protocols', 'ui', 'utils', 'assets', 'tests',
];

console.log('test-generate-index.js');
console.log('─'.repeat(60));

// ── 1. SDF_DOCS completeness ────────────────────────────────────────────────
assert.ok(Array.isArray(SDF_DOCS), 'SDF_DOCS must be an array');
assert.strictEqual(
  SDF_DOCS.length,
  EXPECTED_DOC_COUNT,
  `Expected ${EXPECTED_DOC_COUNT} SDF docs, got ${SDF_DOCS.length}`
);
console.log(`  ✓ SDF_DOCS contains all ${EXPECTED_DOC_COUNT} documents`);

// Every doc must end in .md
for (const doc of SDF_DOCS) {
  assert.ok(doc.endsWith('.md'), `SDF doc "${doc}" should end with .md`);
}
console.log('  ✓ All SDF docs have .md extension');

// ── 2. DOC_META completeness ────────────────────────────────────────────────
assert.ok(typeof DOC_META === 'object', 'DOC_META must be an object');
for (const doc of SDF_DOCS) {
  assert.ok(DOC_META[doc], `DOC_META missing entry for "${doc}"`);
  assert.ok(DOC_META[doc].type, `DOC_META["${doc}"] missing "type"`);
  assert.ok(DOC_META[doc].scope, `DOC_META["${doc}"] missing "scope"`);
}
console.log('  ✓ DOC_META has type + scope for all 22 docs');

// ── 3. FILE_MAPPINGS structure ──────────────────────────────────────────────
assert.ok(Array.isArray(FILE_MAPPINGS), 'FILE_MAPPINGS must be an array');
assert.ok(
  FILE_MAPPINGS.length >= MIN_FILE_MAPPINGS,
  `Expected at least ${MIN_FILE_MAPPINGS} file mappings, got ${FILE_MAPPINGS.length}`
);
console.log(`  ✓ FILE_MAPPINGS has ${FILE_MAPPINGS.length} entries (≥${MIN_FILE_MAPPINGS})`);

// Each mapping must have path, primary, layer
for (let i = 0; i < FILE_MAPPINGS.length; i++) {
  const m = FILE_MAPPINGS[i];
  assert.ok(m.path, `FILE_MAPPINGS[${i}] missing "path"`);
  assert.ok(m.primary, `FILE_MAPPINGS[${i}] (${m.path}) missing "primary"`);
  assert.ok(m.layer, `FILE_MAPPINGS[${i}] (${m.path}) missing "layer"`);
  // Primary doc must be in SDF_DOCS
  assert.ok(
    SDF_DOCS.includes(m.primary),
    `FILE_MAPPINGS[${i}] (${m.path}) primary "${m.primary}" not in SDF_DOCS`
  );
  // Secondary docs must all be in SDF_DOCS
  if (m.secondary) {
    for (const sec of m.secondary) {
      assert.ok(
        SDF_DOCS.includes(sec),
        `FILE_MAPPINGS[${i}] (${m.path}) secondary "${sec}" not in SDF_DOCS`
      );
    }
  }
}
console.log('  ✓ All mappings have required fields and valid doc references');

// ── 4. Layer coverage ───────────────────────────────────────────────────────
const foundLayers = new Set(FILE_MAPPINGS.map(m => m.layer));
for (const layer of EXPECTED_LAYERS) {
  assert.ok(foundLayers.has(layer), `Missing layer "${layer}" in FILE_MAPPINGS`);
}
console.log(`  ✓ All ${EXPECTED_LAYERS.length} expected layers represented`);

// ── 5. No duplicate paths ──────────────────────────────────────────────────
const paths = FILE_MAPPINGS.map(m => m.path);
const dupCheck = new Set();
const dups = [];
for (const p of paths) {
  if (dupCheck.has(p)) dups.push(p);
  dupCheck.add(p);
}
assert.strictEqual(dups.length, 0, `Duplicate paths found: ${dups.join(', ')}`);
console.log('  ✓ No duplicate file paths');

// ── 6. KNOWN_ISSUES ─────────────────────────────────────────────────────────
assert.ok(Array.isArray(KNOWN_ISSUES), 'KNOWN_ISSUES must be an array');
assert.strictEqual(
  KNOWN_ISSUES.length,
  EXPECTED_KNOWN_ISSUES,
  `Expected ${EXPECTED_KNOWN_ISSUES} known issues, got ${KNOWN_ISSUES.length}`
);
for (let i = 0; i < KNOWN_ISSUES.length; i++) {
  const ki = KNOWN_ISSUES[i];
  assert.ok(ki.severity, `KNOWN_ISSUES[${i}] missing "severity"`);
  assert.ok(ki.issue, `KNOWN_ISSUES[${i}] missing "issue"`);
  assert.ok(ki.docs, `KNOWN_ISSUES[${i}] missing "docs"`);
  assert.ok(Array.isArray(ki.docs), `KNOWN_ISSUES[${i}] "docs" must be an array`);
  assert.ok(
    ['high', 'medium', 'low'].includes(ki.severity),
    `KNOWN_ISSUES[${i}] has invalid severity "${ki.severity}"`
  );
}
console.log(`  ✓ KNOWN_ISSUES has ${EXPECTED_KNOWN_ISSUES} issues with valid structure`);

// ── 7. REPO_ROOT / SDF_ROOT ─────────────────────────────────────────────────
assert.ok(typeof REPO_ROOT === 'string', 'REPO_ROOT must be a string');
assert.ok(typeof SDF_ROOT === 'string', 'SDF_ROOT must be a string');
assert.ok(SDF_ROOT.includes('SDF.RETYE.AF.master'), 'SDF_ROOT must reference SDF.RETYE.AF.master');
console.log('  ✓ REPO_ROOT and SDF_ROOT are valid');

// ── 8. Spot-check critical file mappings ────────────────────────────────────
const byPath = {};
for (const m of FILE_MAPPINGS) byPath[m.path] = m;

// Root files
assert.ok(byPath['index.html'], 'Missing mapping: index.html');
assert.ok(byPath['manifest.json'], 'Missing mapping: manifest.json');
assert.ok(byPath['sw.js'], 'Missing mapping: sw.js');

// Bootstrap
assert.ok(byPath['bootstrap/boot.js'], 'Missing mapping: bootstrap/boot.js');

// Kernel
assert.ok(byPath['src/kernel/kernel.u.js'], 'Missing mapping: src/kernel/kernel.u.js');

// Bus
assert.ok(byPath['src/bus/bus.u.js'], 'Missing mapping: src/bus/bus.u.js');

// Units (spot-check a few)
assert.ok(byPath['src/units/pce.u.js'], 'Missing mapping: src/units/pce.u.js');
assert.ok(byPath['src/units/nlp.u.js'], 'Missing mapping: src/units/nlp.u.js');
assert.ok(byPath['src/units/cm.u.js'], 'Missing mapping: src/units/cm.u.js');

// Workers
assert.ok(byPath['src/workers/cognition.worker.js'], 'Missing mapping: src/workers/cognition.worker.js');

// Storage
assert.ok(byPath['src/storage/db.js'], 'Missing mapping: src/storage/db.js');

// VFS
assert.ok(byPath['src/vfs/vfs.js'], 'Missing mapping: src/vfs/vfs.js');

// Assets
assert.ok(byPath['assets/styles/base.css'], 'Missing mapping: assets/styles/base.css');

// sfti.iso
assert.ok(byPath['sfti.iso'], 'Missing mapping: sfti.iso');

console.log('  ✓ Spot-check: critical file mappings all present');

// ── 9. Cross-doc referential integrity ──────────────────────────────────────
// Every secondary doc should also appear as a primary somewhere (not strict, but good practice)
const primarySet = new Set(FILE_MAPPINGS.map(m => m.primary));
const allSecondary = new Set();
for (const m of FILE_MAPPINGS) {
  if (m.secondary) m.secondary.forEach(s => allSecondary.add(s));
}
// Cross-cutting docs (STRUCTURE.md, API.md, README.md) may only appear as secondary
const crossCutting = new Set(['STRUCTURE.md', 'API.md', 'README.md']);
for (const sec of allSecondary) {
  if (!primarySet.has(sec) && !crossCutting.has(sec)) {
    console.log(`  ⚠ "${sec}" appears as secondary but never as primary`);
  }
}
console.log('  ✓ Cross-doc referential integrity checked');

console.log('\n  ✓ All generate-sdf-index tests passed.\n');
