#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Test: validate-assets.js
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const {
  validateAssetFile,
  checkRequiredAssets,
  scanDir,
  REQUIRED_STYLES,
  REQUIRED_ICON_FILES,
  REQUIRED_DIRS,
  REPO_ROOT,
} = require('../../scripts/validate-assets.js');

const TMP_DIR = path.join(REPO_ROOT, '.github', 'statik.ai.QCS', 'tests', 'sdf', '__tmp_asset_test__');

console.log('test-validate-assets.js');
console.log('─'.repeat(60));

function setup() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function teardown() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

// ── 1. Valid CSS file ───────────────────────────────────────────────────────
function testValidCss() {
  const filePath = path.join(TMP_DIR, 'valid.css');
  fs.writeFileSync(filePath, 'body { margin: 0; }');

  const errors = validateAssetFile(filePath);
  assert.strictEqual(errors.length, 0, `Valid CSS should pass, got: ${errors.join(', ')}`);
  console.log('  ✓ Valid CSS file passes');
}

// ── 2. Empty CSS file ──────────────────────────────────────────────────────
function testEmptyCss() {
  const filePath = path.join(TMP_DIR, 'empty.css');
  fs.writeFileSync(filePath, '   ');

  const errors = validateAssetFile(filePath);
  assert.ok(errors.length > 0, 'Empty CSS should produce error');
  assert.ok(errors.some(e => e.includes('empty')), `Error should mention empty, got: ${errors.join(', ')}`);
  console.log('  ✓ Empty CSS file detected');
}

// ── 3. Filename with spaces ────────────────────────────────────────────────
function testSpacesInFilename() {
  const filePath = path.join(TMP_DIR, 'my file.txt');
  fs.writeFileSync(filePath, 'content');

  const errors = validateAssetFile(filePath);
  assert.ok(errors.length > 0, 'Filename with spaces should produce error');
  assert.ok(errors.some(e => e.includes('spaces')), `Error should mention spaces, got: ${errors.join(', ')}`);
  console.log('  ✓ Filename with spaces detected');
}

// ── 4. Valid JSON asset with "id" field ─────────────────────────────────────
function testValidJsonAsset() {
  const filePath = path.join(TMP_DIR, 'valid-asset.json');
  fs.writeFileSync(filePath, JSON.stringify({ id: 'test-asset', name: 'Test' }));

  const errors = validateAssetFile(filePath);
  assert.strictEqual(errors.length, 0, `Valid JSON asset should pass, got: ${errors.join(', ')}`);
  console.log('  ✓ Valid JSON asset with "id" passes');
}

// ── 5. JSON asset missing "id" field ────────────────────────────────────────
function testJsonMissingId() {
  const filePath = path.join(TMP_DIR, 'no-id.json');
  fs.writeFileSync(filePath, JSON.stringify({ name: 'Missing ID' }));

  const errors = validateAssetFile(filePath);
  assert.ok(errors.length > 0, 'JSON without "id" should produce error');
  assert.ok(errors.some(e => e.includes('id')), `Error should mention id, got: ${errors.join(', ')}`);
  console.log('  ✓ JSON asset missing "id" detected');
}

// ── 6. Invalid JSON asset ──────────────────────────────────────────────────
function testInvalidJsonAsset() {
  const filePath = path.join(TMP_DIR, 'broken.json');
  fs.writeFileSync(filePath, '{ not valid }');

  const errors = validateAssetFile(filePath);
  assert.ok(errors.length > 0, 'Invalid JSON should produce error');
  assert.ok(errors.some(e => e.includes('Invalid JSON')), `Error should mention Invalid JSON, got: ${errors.join(', ')}`);
  console.log('  ✓ Invalid JSON asset detected');
}

// ── 7. Valid PNG file (no special checks, just no spaces) ────────────────────
function testValidPng() {
  const filePath = path.join(TMP_DIR, 'icon.png');
  fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4E, 0x47])); // PNG magic bytes

  const errors = validateAssetFile(filePath);
  assert.strictEqual(errors.length, 0, `Valid PNG should pass, got: ${errors.join(', ')}`);
  console.log('  ✓ Valid PNG file passes');
}

// ── 8. Required assets constants ────────────────────────────────────────────
function testRequiredConstants() {
  assert.ok(Array.isArray(REQUIRED_STYLES), 'REQUIRED_STYLES must be array');
  assert.ok(REQUIRED_STYLES.length >= 3, `Expected at least 3 required styles, got ${REQUIRED_STYLES.length}`);
  assert.ok(REQUIRED_STYLES.includes('assets/styles/base.css'), 'Missing base.css');
  assert.ok(REQUIRED_STYLES.includes('assets/styles/chat.css'), 'Missing chat.css');
  assert.ok(REQUIRED_STYLES.includes('assets/styles/inspector.css'), 'Missing inspector.css');

  assert.ok(Array.isArray(REQUIRED_ICON_FILES), 'REQUIRED_ICON_FILES must be array');
  assert.ok(REQUIRED_ICON_FILES.length >= 4, `Expected at least 4 icon files, got ${REQUIRED_ICON_FILES.length}`);

  assert.ok(Array.isArray(REQUIRED_DIRS), 'REQUIRED_DIRS must be array');
  assert.ok(REQUIRED_DIRS.includes('assets/styles'), 'Missing assets/styles');
  assert.ok(REQUIRED_DIRS.includes('assets/icons'), 'Missing assets/icons');
  assert.ok(REQUIRED_DIRS.includes('assets/fonts'), 'Missing assets/fonts');

  console.log('  ✓ Required asset constants verified');
}

// ── 9. scanDir function ─────────────────────────────────────────────────────
function testScanDir() {
  fs.writeFileSync(path.join(TMP_DIR, 'file1.css'), 'a{}');
  fs.writeFileSync(path.join(TMP_DIR, 'file2.png'), 'x');
  const sub = path.join(TMP_DIR, 'nested');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'file3.css'), 'b{}');

  const results = scanDir(TMP_DIR);
  assert.ok(results.length >= 3, `Should find at least 3 files, found ${results.length}`);
  console.log('  ✓ scanDir finds all asset files recursively');
}

// ── 10. checkRequiredAssets (expected to fail without full repo) ─────────────
function testCheckRequiredAssets() {
  // In a repo without assets/ yet, this should report missing items
  const errors = checkRequiredAssets();
  // We can't assert the exact count since the user might have created assets/ 
  // Just confirm the function runs and returns an array
  assert.ok(Array.isArray(errors), 'checkRequiredAssets should return an array');
  console.log(`  ✓ checkRequiredAssets returns ${errors.length} issue(s) (expected for partial repo)`);
}

// ── Run ──────────────────────────────────────────────────────────────────────
try {
  setup();
  testValidCss();
  testEmptyCss();
  testSpacesInFilename();
  testValidJsonAsset();
  testJsonMissingId();
  testInvalidJsonAsset();
  testValidPng();
  testRequiredConstants();
  testScanDir();
  testCheckRequiredAssets();
  console.log('\n  ✓ All validate-assets tests passed.\n');
} finally {
  teardown();
}
