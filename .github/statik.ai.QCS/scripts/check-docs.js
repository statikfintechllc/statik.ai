#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — SDF Docs Check v2.0
// ──────────────────────────────────────────────────────────────────────────────
// Checks whether changed repo files have corresponding SDF doc updates.
// Uses the sdf-index.yaml for file→doc mapping.
//
// Usage: node check-docs.js --files "src/kernel/kernel.u.js,src/bus/bus.u.js"
// Exit:  0 = pass, 1 = fail
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('fs');
const path = require('path');

// From: .github/statik.ai.QCS/scripts/  →  repo root (3 levels up)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SDF_ROOT  = path.join(REPO_ROOT, 'docs', 'SDF.RETYE.AF.master');

// Import the authoritative mapping
const { FILE_MAPPINGS, SDF_DOCS } = require('./generate-sdf-index.js');

// ── Glob matcher ────────────────────────────────────────────────────────────
function globToRegex(glob) {
  let re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*');
  return new RegExp(`^${re}$`);
}

// ── Find SDF docs for a file path ───────────────────────────────────────────
function findDocsForFile(filePath) {
  // Normalize: strip leading ./ or /
  const clean = filePath.replace(/^\.?\//, '');

  // Direct match
  const direct = FILE_MAPPINGS.find(m => m.path === clean);
  if (direct) {
    return { primary: direct.primary, secondary: direct.secondary, specificity: 'exact' };
  }

  // Glob match (for paths not individually listed)
  for (const m of FILE_MAPPINGS) {
    if (m.path.includes('*') && globToRegex(m.path).test(clean)) {
      return { primary: m.primary, secondary: m.secondary, specificity: 'glob' };
    }
  }

  // Directory-based fallback: match by longest prefix
  let best = null;
  let bestLen = 0;
  for (const m of FILE_MAPPINGS) {
    const dir = path.dirname(m.path);
    if (clean.startsWith(dir + '/') && dir.length > bestLen) {
      best = m;
      bestLen = dir.length;
    }
  }
  if (best) {
    return { primary: best.primary, secondary: best.secondary, specificity: 'directory' };
  }

  return null;
}

// ── Parse arguments ─────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let files = [];
  let docsSignoff = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
      files = args[i + 1].split(',').map(f => f.trim()).filter(Boolean);
      i++;
    }
    if (args[i] === '--docs-signoff') {
      docsSignoff = true;
    }
  }
  return { files, docsSignoff };
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const { files, docsSignoff } = parseArgs();

  if (files.length === 0) {
    console.log('statik.ai.QCS — No changed files to check.');
    process.exit(0);
  }

  if (docsSignoff) {
    console.log('statik.ai.QCS — Docs signoff override active. Skipping check.');
    process.exit(0);
  }

  console.log('statik.ai.QCS — SDF Docs Check v2.0');
  console.log('─'.repeat(60));
  console.log(`  Checking ${files.length} changed file(s)...\n`);

  // Separate changed docs from changed source files
  const changedDocs = new Set();
  const sourceFiles = [];

  for (const f of files) {
    const clean = f.replace(/^\.?\//, '');

    // Skip QA infrastructure
    if (clean.startsWith('.github/')) continue;

    // Track changed SDF docs
    if (clean.startsWith('docs/SDF.RETYE.AF.master/')) {
      const docName = path.basename(clean);
      changedDocs.add(docName);
      continue;
    }

    // Skip docs/ changes that aren't SDF source
    if (clean.startsWith('docs/')) continue;

    sourceFiles.push(clean);
  }

  if (sourceFiles.length === 0) {
    console.log('  ✓ No source files changed — only docs/QA. Pass.\n');
    process.exit(0);
  }

  // Check each source file
  const failures = [];
  const warnings = [];
  const passes   = [];

  for (const file of sourceFiles) {
    const match = findDocsForFile(file);

    if (!match) {
      warnings.push({ file, reason: 'No SDF doc mapping found (unmapped file)' });
      continue;
    }

    const primaryDoc = match.primary;

    // Check if the primary doc was updated in this change
    if (changedDocs.has(primaryDoc)) {
      passes.push({ file, doc: primaryDoc, specificity: match.specificity });
    } else {
      // Check if ANY secondary doc was updated
      const secondaryUpdated = match.secondary.filter(d => changedDocs.has(d));
      if (secondaryUpdated.length > 0) {
        passes.push({ file, doc: secondaryUpdated[0], specificity: 'secondary' });
      } else {
        failures.push({ file, doc: primaryDoc, secondary: match.secondary, specificity: match.specificity });
      }
    }
  }

  // Report
  if (passes.length > 0) {
    console.log(`  ✓ ${passes.length} file(s) have matching doc updates:`);
    for (const p of passes) {
      console.log(`    ✓ ${p.file}  →  ${p.doc} (${p.specificity})`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`  ⚠ ${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.log(`    ⚠ ${w.file}: ${w.reason}`);
    }
    console.log('');
  }

  if (failures.length > 0) {
    console.log(`  ✗ ${failures.length} file(s) MISSING doc updates:`);
    for (const f of failures) {
      const allDocs = [f.doc, ...f.secondary].join(', ');
      console.log(`    ✗ ${f.file}`);
      console.log(`      Governing doc: ${f.doc} (${f.specificity})`);
      if (f.secondary.length > 0) {
        console.log(`      Also referenced by: ${f.secondary.join(', ')}`);
      }
      console.log(`      → Update docs/SDF.RETYE.AF.master/${f.doc}`);
    }
    console.log('');
    console.log('  To bypass: add --docs-signoff flag or update the SDF doc(s).\n');
    process.exit(1);
  }

  console.log('  ✓ All changed files have corresponding SDF doc updates. Pass.\n');
  process.exit(0);
}

// Exports for testing
module.exports = { findDocsForFile, REPO_ROOT };

if (require.main === module) {
  main();
}
