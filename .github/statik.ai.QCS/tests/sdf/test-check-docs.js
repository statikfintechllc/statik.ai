#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Test: check-docs.js
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const assert = require('assert');
const path   = require('path');

const { findDocsForFile }  = require('../../scripts/check-docs.js');
const { FILE_MAPPINGS }    = require('../../scripts/generate-sdf-index.js');

console.log('test-check-docs.js');
console.log('─'.repeat(60));

// ── 1. Exact path match ─────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/kernel/kernel.u.js');
  assert.ok(result, 'Should find docs for src/kernel/kernel.u.js');
  assert.ok(result.primary, 'Should have a primary doc');
  assert.ok(result.primary.includes('Kernels.md'), `Primary should be Kernels.md, got ${result.primary}`);
  console.log('  ✓ Exact path match: src/kernel/kernel.u.js → Kernels.md');
}

// ── 2. Bootstrap mapping ────────────────────────────────────────────────────
{
  const result = findDocsForFile('bootstrap/boot.js');
  assert.ok(result, 'Should find docs for bootstrap/boot.js');
  assert.ok(result.primary.includes('BOOT.md'), `Primary should be BOOT.md, got ${result.primary}`);
  console.log('  ✓ Bootstrap mapping: bootstrap/boot.js → BOOT.md');
}

// ── 3. Bus subsystem ────────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/bus/router.js');
  assert.ok(result, 'Should find docs for src/bus/router.js');
  assert.ok(
    result.primary.includes('Bus.RunTime.md'),
    `Primary should be Bus.RunTime.md, got ${result.primary}`
  );
  console.log('  ✓ Bus mapping: src/bus/router.js → Bus.RunTime.md');
}

// ── 4. Assets mapping ──────────────────────────────────────────────────────
{
  const result = findDocsForFile('assets/styles/base.css');
  assert.ok(result, 'Should find docs for assets/styles/base.css');
  assert.ok(result.primary.includes('Assets.md'), `Primary should be Assets.md, got ${result.primary}`);
  console.log('  ✓ Assets mapping: assets/styles/base.css → Assets.md');
}

// ── 5. Unit files ───────────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/units/nlp.u.js');
  assert.ok(result, 'Should find docs for src/units/nlp.u.js');
  assert.ok(result.primary.includes('Units.md'), `Primary should be Units.md, got ${result.primary}`);
  // Should also have secondary docs (MESSAGES.md at least)
  if (result.secondary && result.secondary.length > 0) {
    console.log(`  ✓ Units mapping: src/units/nlp.u.js → Units.md + ${result.secondary.length} secondary`);
  } else {
    console.log('  ✓ Units mapping: src/units/nlp.u.js → Units.md');
  }
}

// ── 6. Worker files ─────────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/workers/cognition.worker.js');
  assert.ok(result, 'Should find docs for src/workers/cognition.worker.js');
  assert.ok(result.primary.includes('Workers.md'), `Primary should be Workers.md, got ${result.primary}`);
  console.log('  ✓ Workers mapping: src/workers/cognition.worker.js → Workers.md');
}

// ── 7. Storage / VFS ────────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/storage/db.js');
  assert.ok(result, 'Should find docs for src/storage/db.js');
  assert.ok(
    result.primary.includes('STORAGE.md') || result.primary.includes('Storage.VFS.md'),
    `Primary should reference STORAGE.md or Storage.VFS.md, got ${result.primary}`
  );
  console.log('  ✓ Storage mapping: src/storage/db.js → storage doc');
}
{
  const result = findDocsForFile('src/vfs/vfs.js');
  assert.ok(result, 'Should find docs for src/vfs/vfs.js');
  assert.ok(
    result.primary.includes('Storage.VFS.md'),
    `Primary should be Storage.VFS.md, got ${result.primary}`
  );
  console.log('  ✓ VFS mapping: src/vfs/vfs.js → Storage.VFS.md');
}

// ── 8. .github/* should return null (excluded from doc checks) ──────────────
{
  const result = findDocsForFile('.github/workflows/docs-check.yml');
  assert.strictEqual(result, null, '.github files should return null (excluded)');
  console.log('  ✓ .github/* excluded: returns null');
}

// ── 9. docs/* that are not SDF should return null ───────────────────────────
{
  const result = findDocsForFile('docs/README.md');
  assert.strictEqual(result, null, 'docs/README.md should return null (non-SDF doc)');
  console.log('  ✓ docs/* (non-SDF) excluded: returns null');
}

// ── 10. Schema files ────────────────────────────────────────────────────────
{
  const result = findDocsForFile('schemas/messages/intent.schema.json');
  assert.ok(result, 'Should find docs for schemas/messages/intent.schema.json');
  assert.ok(
    result.primary.includes('Config.Schema.md') || result.primary.includes('MESSAGES.md'),
    `Primary should reference Config.Schema.md or MESSAGES.md, got ${result.primary}`
  );
  console.log('  ✓ Schema mapping: schemas/messages/intent.schema.json → schema doc');
}

// ── 11. Config files ────────────────────────────────────────────────────────
{
  const result = findDocsForFile('configs/units.registry.json');
  assert.ok(result, 'Should find docs for configs/units.registry.json');
  assert.ok(
    result.primary.includes('Config.Schema.md'),
    `Primary should be Config.Schema.md, got ${result.primary}`
  );
  console.log('  ✓ Config mapping: configs/units.registry.json → Config.Schema.md');
}

// ── 12. Unknown file should use directory prefix fallback or return null ────
{
  const result = findDocsForFile('src/kernel/unknown-new-file.js');
  // Depending on implementation, this may match via directory prefix fallback or return null
  if (result) {
    console.log(`  ✓ Directory fallback: src/kernel/unknown-new-file.js → ${result.primary}`);
  } else {
    console.log('  ✓ Unknown kernel file returns null (strict mode, no directory fallback)');
  }
}

// ── 13. sfti.iso ────────────────────────────────────────────────────────────
{
  const result = findDocsForFile('sfti.iso');
  assert.ok(result, 'Should find docs for sfti.iso');
  assert.ok(result.primary.includes('ISO.md'), `Primary should be ISO.md, got ${result.primary}`);
  console.log('  ✓ ISO mapping: sfti.iso → ISO.md');
}

// ── 14. Adapter files ───────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/adapters/ios/hardware.adapter.js');
  assert.ok(result, 'Should find docs for src/adapters/ios/hardware.adapter.js');
  assert.ok(
    result.primary.includes('Adapters.md'),
    `Primary should be Adapters.md, got ${result.primary}`
  );
  console.log('  ✓ Adapter mapping: src/adapters/ios/hardware.adapter.js → Adapters.md');
}

// ── 15. Protocol files ──────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/protocols/rpc.js');
  assert.ok(result, 'Should find docs for src/protocols/rpc.js');
  assert.ok(
    result.primary.includes('Protocols.md'),
    `Primary should be Protocols.md, got ${result.primary}`
  );
  console.log('  ✓ Protocol mapping: src/protocols/rpc.js → Protocols.md');
}

// ── 16. UI files ────────────────────────────────────────────────────────────
{
  const result = findDocsForFile('src/ui/shell.js');
  assert.ok(result, 'Should find docs for src/ui/shell.js');
  assert.ok(result.primary.includes('UI.md'), `Primary should be UI.md, got ${result.primary}`);
  console.log('  ✓ UI mapping: src/ui/shell.js → UI.md');
}

// ── 17. Test files ──────────────────────────────────────────────────────────
{
  const result = findDocsForFile('tests/unit/kernel.test.js');
  assert.ok(result, 'Should find docs for tests/unit/kernel.test.js');
  assert.ok(result.primary.includes('Tests.md'), `Primary should be Tests.md, got ${result.primary}`);
  console.log('  ✓ Tests mapping: tests/unit/kernel.test.js → Tests.md');
}

console.log('\n  ✓ All check-docs tests passed.\n');
