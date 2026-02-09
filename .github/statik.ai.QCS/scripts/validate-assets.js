#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — Asset Validator v2.0
// ──────────────────────────────────────────────────────────────────────────────
// Validates files in assets/ per Assets.md specification:
//   - No spaces in filenames
//   - CSS files must be non-empty
//   - JSON files must have an "id" field
//   - Expected styles: base.css, chat.css, inspector.css
//   - Expected icon directories/files
//
// Usage: node validate-assets.js [--files "file1,file2"]
// Exit:  0 = pass, 1 = fail
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Per Assets.md — required asset files
const REQUIRED_STYLES = [
  'assets/styles/base.css',
  'assets/styles/chat.css',
  'assets/styles/inspector.css',
];

const REQUIRED_ICON_FILES = [
  'assets/icons/icon-72.png',
  'assets/icons/icon-180.png',
  'assets/icons/icon-512.png',
  'assets/icons/background.png',
];

const REQUIRED_DIRS = [
  'assets/styles',
  'assets/icons',
  'assets/fonts',
];

function scanDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function validateAssetFile(filePath) {
  const errors = [];
  const rel = path.relative(REPO_ROOT, filePath);
  const basename = path.basename(filePath);

  // 1. No spaces in filenames
  if (/\s/.test(basename)) {
    errors.push(`${rel}: Filename contains spaces — rename without spaces`);
  }

  // 2. CSS files must be non-empty
  if (filePath.endsWith('.css')) {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.length === 0) {
      errors.push(`${rel}: CSS file is empty`);
    }
  }

  // 3. JSON files must have an "id" field
  if (filePath.endsWith('.json')) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        if (!data.id) {
          errors.push(`${rel}: JSON asset missing "id" field`);
        }
      }
    } catch (e) {
      errors.push(`${rel}: Invalid JSON — ${e.message}`);
    }
  }

  return errors;
}

function checkRequiredAssets() {
  const errors = [];

  // Check required directories
  for (const dir of REQUIRED_DIRS) {
    const full = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(full)) {
      errors.push(`Missing required directory: ${dir}/`);
    }
  }

  // Check required style files
  for (const style of REQUIRED_STYLES) {
    const full = path.join(REPO_ROOT, style);
    if (!fs.existsSync(full)) {
      errors.push(`Missing required style: ${style}`);
    }
  }

  // Check required icon files
  for (const icon of REQUIRED_ICON_FILES) {
    const full = path.join(REPO_ROOT, icon);
    if (!fs.existsSync(full)) {
      errors.push(`Missing required icon: ${icon}`);
    }
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

  console.log('statik.ai.QCS — Asset Validator v2.0');
  console.log('─'.repeat(60));

  let files;
  if (targetFiles) {
    files = targetFiles
      .filter(f => {
        const c = f.replace(/^\.?\//, '');
        return c.startsWith('assets/');
      })
      .map(f => path.join(REPO_ROOT, f.replace(/^\.?\//, '')))
      .filter(f => fs.existsSync(f));
  } else {
    files = scanDir(path.join(REPO_ROOT, 'assets'));
  }

  const allErrors = [];
  let passed = 0;

  // Individual file validation
  if (files.length === 0) {
    console.log('  No asset files found to validate.\n');
  } else {
    console.log(`  Validating ${files.length} asset file(s)...\n`);
    for (const file of files) {
      const errors = validateAssetFile(file);
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
  }

  // Structural/required checks (only in full-scan mode)
  if (!targetFiles) {
    console.log('\n  Checking required asset structure...\n');
    const structural = checkRequiredAssets();
    if (structural.length > 0) {
      allErrors.push(...structural);
      for (const e of structural) {
        console.log(`  ✗ ${e}`);
      }
    } else {
      console.log('  ✓ All required assets present.\n');
    }
  }

  console.log('');
  if (allErrors.length > 0) {
    console.log(`  ${allErrors.length} error(s) found.\n`);
    process.exit(1);
  }

  console.log(`  ✓ All ${passed} asset file(s) valid.\n`);
  process.exit(0);
}

module.exports = {
  validateAssetFile,
  checkRequiredAssets,
  scanDir,
  REQUIRED_STYLES,
  REQUIRED_ICON_FILES,
  REQUIRED_DIRS,
  REPO_ROOT,
};

if (require.main === module) {
  main();
}
