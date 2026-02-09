#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Test: validate-schemas.js
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const { validateJsonFile, scanDir, REPO_ROOT } = require('../../scripts/validate-schemas.js');

const TMP_DIR = path.join(REPO_ROOT, '.github', 'statik.ai.QCS', 'tests', 'sdf', '__tmp_schema_test__');

console.log('test-validate-schemas.js');
console.log('─'.repeat(60));

// ── Setup ────────────────────────────────────────────────────────────────────
function setup() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function teardown() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

// ── 1. Valid schema file ────────────────────────────────────────────────────
function testValidSchema() {
  const filePath = path.join(TMP_DIR, 'valid.schema.json');
  const content = JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
    },
    required: ['id'],
  }, null, 2);
  fs.writeFileSync(filePath, content);

  // validateJsonFile checks based on relative path to REPO_ROOT
  // We need to fake the path to start with schemas/
  const fakeSchemaPath = path.join(REPO_ROOT, 'schemas', 'test.schema.json');
  fs.mkdirSync(path.dirname(fakeSchemaPath), { recursive: true });
  fs.writeFileSync(fakeSchemaPath, content);

  const errors = validateJsonFile(fakeSchemaPath);
  assert.strictEqual(errors.length, 0, `Valid schema should have no errors, got: ${errors.join(', ')}`);

  // Cleanup fake file
  fs.unlinkSync(fakeSchemaPath);
  console.log('  ✓ Valid schema file passes validation');
}

// ── 2. Invalid JSON ─────────────────────────────────────────────────────────
function testInvalidJson() {
  const filePath = path.join(TMP_DIR, 'invalid.json');
  fs.writeFileSync(filePath, '{ not valid json }');

  const errors = validateJsonFile(filePath);
  assert.ok(errors.length > 0, 'Invalid JSON should produce errors');
  assert.ok(errors[0].includes('Invalid JSON'), `Error should mention invalid JSON, got: ${errors[0]}`);
  console.log('  ✓ Invalid JSON detected');
}

// ── 3. Schema missing type/$schema ──────────────────────────────────────────
function testSchemaMissingType() {
  const fakeSchemaPath = path.join(REPO_ROOT, 'schemas', 'noType.schema.json');
  fs.mkdirSync(path.dirname(fakeSchemaPath), { recursive: true });
  fs.writeFileSync(fakeSchemaPath, JSON.stringify({ description: 'a schema with no type' }));

  const errors = validateJsonFile(fakeSchemaPath);
  assert.ok(errors.length > 0, 'Schema missing type should produce an error');
  assert.ok(
    errors.some(e => e.includes('missing') || e.includes('type')),
    `Should warn about missing type, got: ${errors.join(', ')}`
  );

  fs.unlinkSync(fakeSchemaPath);
  console.log('  ✓ Schema missing type/$schema detected');
}

// ── 4. Config file validation ───────────────────────────────────────────────
function testValidConfig() {
  const fakeConfigPath = path.join(REPO_ROOT, 'configs', 'test.json');
  fs.mkdirSync(path.dirname(fakeConfigPath), { recursive: true });
  fs.writeFileSync(fakeConfigPath, JSON.stringify({ key: 'value', enabled: true }));

  const errors = validateJsonFile(fakeConfigPath);
  assert.strictEqual(errors.length, 0, `Valid config should have no errors, got: ${errors.join(', ')}`);

  fs.unlinkSync(fakeConfigPath);
  console.log('  ✓ Valid config file passes');
}

// ── 5. scanDir function ─────────────────────────────────────────────────────
function testScanDir() {
  // Create some test files
  fs.writeFileSync(path.join(TMP_DIR, 'a.json'), '{}');
  fs.writeFileSync(path.join(TMP_DIR, 'b.json'), '{}');
  fs.writeFileSync(path.join(TMP_DIR, 'c.txt'), 'not json');
  const sub = path.join(TMP_DIR, 'sub');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'd.json'), '{}');

  const results = scanDir(TMP_DIR);
  const jsonFiles = results.filter(f => f.endsWith('.json'));
  assert.ok(jsonFiles.length >= 3, `Should find at least 3 JSON files, found ${jsonFiles.length}`);
  assert.ok(!results.some(f => f.endsWith('.txt')), 'Should not include .txt files');
  console.log('  ✓ scanDir finds JSON files recursively');
}

// ── 6. Non-existent directory ───────────────────────────────────────────────
function testNonExistentDir() {
  const results = scanDir(path.join(REPO_ROOT, 'nonexistent_dir_xyz'));
  assert.strictEqual(results.length, 0, 'Non-existent dir should return empty array');
  console.log('  ✓ Non-existent directory returns empty');
}

// ── Run ──────────────────────────────────────────────────────────────────────
try {
  setup();
  testValidSchema();
  testInvalidJson();
  testSchemaMissingType();
  testValidConfig();
  testScanDir();
  testNonExistentDir();
  console.log('\n  ✓ All validate-schemas tests passed.\n');
} finally {
  teardown();
  // Also clean up schemas/ and configs/ test dirs if empty
  try {
    const sd = path.join(REPO_ROOT, 'schemas');
    if (fs.existsSync(sd) && fs.readdirSync(sd).length === 0) fs.rmdirSync(sd);
  } catch (e) { /* ignore */ }
  try {
    const cd = path.join(REPO_ROOT, 'configs');
    if (fs.existsSync(cd) && fs.readdirSync(cd).length === 0) fs.rmdirSync(cd);
  } catch (e) { /* ignore */ }
}
