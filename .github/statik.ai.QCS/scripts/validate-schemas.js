#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Schema & Config Validator v2.0
// ──────────────────────────────────────────────────────────────────────────────
// Validates JSON files in schemas/ and configs/ directories.
//
// Usage: node validate-schemas.js [--files "file1,file2"]
// Exit:  0 = pass, 1 = fail
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function scanDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(full));
    } else if (entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function validateJsonFile(filePath) {
  const errors = [];
  const rel = path.relative(REPO_ROOT, filePath);
  let data;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    errors.push(`${rel}: Invalid JSON — ${e.message}`);
    return errors;
  }

  // Schema files should have structure
  if (rel.startsWith('schemas/')) {
    if (!data.type && !data.$schema && !data.oneOf && !data.anyOf && !data.allOf) {
      errors.push(`${rel}: Schema missing "type", "$schema", or "oneOf/anyOf/allOf"`);
    }
    if (data.type === 'object' && !data.properties && !data.additionalProperties) {
      errors.push(`${rel}: Object schema missing "properties"`);
    }
  }

  // Config files — basic structure check
  if (rel.startsWith('configs/')) {
    if (typeof data !== 'object' || data === null) {
      errors.push(`${rel}: Config must be a JSON object`);
    }
  }

  // Naming convention warnings
  if (rel.startsWith('schemas/') && !rel.includes('.schema.json')) {
    errors.push(`${rel}: Schema file should use .schema.json extension`);
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  let targetFiles = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
      targetFiles = args[i + 1].split(',').map(f => f.trim()).filter(Boolean);
      i++;
    }
  }

  console.log('statik.ai.QCS — Schema & Config Validator v2.0');
  console.log('─'.repeat(60));

  let files;
  if (targetFiles) {
    files = targetFiles
      .filter(f => {
        const c = f.replace(/^\.?\//, '');
        return c.startsWith('schemas/') || c.startsWith('configs/');
      })
      .map(f => path.join(REPO_ROOT, f.replace(/^\.?\//, '')))
      .filter(f => fs.existsSync(f));
  } else {
    files = [
      ...scanDir(path.join(REPO_ROOT, 'schemas')),
      ...scanDir(path.join(REPO_ROOT, 'configs')),
    ];
  }

  if (files.length === 0) {
    console.log('  No schema/config files to validate.\n');
    process.exit(0);
  }

  console.log(`  Validating ${files.length} file(s)...\n`);

  const allErrors = [];
  let passed = 0;

  for (const file of files) {
    const errors = validateJsonFile(file);
    if (errors.length === 0) {
      passed++;
      console.log(`  ✓ ${path.relative(REPO_ROOT, file)}`);
    } else {
      allErrors.push(...errors);
      for (const e of errors) {
        console.log(`  ✗ ${e}`);
      }
    }
  }

  console.log('');
  if (allErrors.length > 0) {
    console.log(`  ${allErrors.length} error(s) found across ${files.length - passed} file(s).\n`);
    process.exit(1);
  }

  console.log(`  ✓ All ${passed} file(s) valid.\n`);
  process.exit(0);
}

module.exports = { validateJsonFile, scanDir, REPO_ROOT };

if (require.main === module) {
  main();
}
