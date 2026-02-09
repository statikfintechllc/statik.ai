<div align="center">

# statik.ai.QCS
### Quality Control System

**SDF-Driven CI Enforcement for the statik.ai Cognitive Runtime**

</div>

---

## Why This Exists

statik.ai is a **docs-first** system. The 22 markdown specifications in `docs/SDF.RETYE.AF.master/` define every file, interface, bus topic, schema, and boot sequence in the entire runtime. **SDF** stands for **Source Docs Folder**, and **RETYE** means **Read Every Time You Edit**.

The QCS exists to **enforce that contract automatically**:

- Every source file change must be traceable back to its governing SDF document.
- Schemas and configs must parse correctly and follow structural conventions.
- Assets must meet naming, format, and completeness requirements.
- When docs and code drift apart, the CI pipeline catches it **before** merge.

This system lives in `.github/` — not in the repo source tree — because it is quality assurance **for** the repo, not **part of** the runtime.

---

## For AI Agents

> **If you are an AI agent (Copilot, Claude, Gemini, or any autonomous builder working on statik.ai), read this section carefully.**

### Key Conventions

1. **SDF.RETYE.AF.master** = Source of truth. Before editing any file, read the corresponding SDF doc(s). Use the file's `primary` doc first, then `secondary` docs for cross-cutting context.

2. **File → Doc Mapping** is defined in `scripts/generate-sdf-index.js`. It contains **113 exact file-path mappings** across **13 architectural layers**, each pointing to its governing SDF doc(s). When you create or modify a file, ensure its SDF mapping exists.

3. **22 SDF Documents** cover the complete system:
   - `STRUCTURE.md` — Authoritative directory tree (102+ files)
   - `BOOT.md` — Cold-start boot sequence (Phase 0–4, <500ms)
   - `Root.Boot.md` — Root files: `index.html`, `manifest.json`, `sw.js`, `bootstrap/`
   - `Kernels.md` — `src/kernel/` (kernel.u.js, lifecycle, registry, watchdog)
   - `Bus.RunTime.md` — `src/bus/` + `src/runtime/` (bus, channels, router, scheduler)
   - `Units.md` — All 19 cognitive units (`src/units/*.u.js`)
   - `Workers.md` — 4 Web Workers (`src/workers/`)
   - `Adapters.md` — Platform adapters: iOS, Web, Universal (`src/adapters/`)
   - `MESSAGES.md` — Cognitive message architecture, NLP patterns, delta learning
   - `STORAGE.md` — Multi-tier storage: IndexedDB, OPFS, SW cache, migrations
   - `Storage.VFS.md` — `src/storage/` + `src/vfs/` per-file specs
   - `Config.Schema.md` — `configs/` (4 JSON configs) + `schemas/` (9 JSON schemas)
   - `Protocols.md` — `src/protocols/` (RPC, stream, event, handshake)
   - `UI.md` — `src/ui/` (shell, chat, inspectors, editor, controls — 11 files)
   - `Utils.md` — `src/utils/` (7 utilities: id, time, math, hash, validate, logger, crypto)
   - `Assets.md` — `assets/` (icons, stylesheets, fonts, design tokens)
   - `Tests.md` — `tests/` (unit/integration/e2e — 20+ test files)
   - `ISO.md` — `sfti.iso` snapshot format
   - `iOS.md` — iOS PWA integration (storage, push, hardware, debugging)
   - `API.md` — All public interfaces, bus API, performance guarantees
   - `ignore.IPA.md` — IPA declared infeasible, PWA-first
   - `README.md` — Project overview, architecture, roadmap

4. **17 Known Cross-Doc Contradictions** are catalogued in `generate-sdf-index.js → KNOWN_ISSUES[]`. Before implementing ambiguous specs, check this list. Key conflicts:
   - **NLP topics**: `Units.md` says `intent.parse`/`intent.parsed`; `MESSAGES.md` says `nlp.parse`/`ui.render`
   - **Entry point**: `Root.Boot.md` has `index.html` importing `kernel.u.js`; `BOOT.md` has `bootstrap/boot.js` as IIFE entry
   - **CM subscriptions**: `Units.md` says `memory.store`/`memory.retrieve`; `MESSAGES.md` says `context.temporal`
   - **Validator signature**: `BOOT.md` says `validate(topic, payload)`; `Bus.RunTime.md` says `validate(message, schemaName)`

5. **Path Resolution** — All scripts in this directory use:
   ```js
   // From .github/statik.ai.QCS/scripts/ → repo root (3 levels up)
   const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
   ```

6. **Zero external dependencies.** Everything runs on Node.js ≥18 stdlib (`fs`, `path`, `assert`). No `npm install` required.

---

## Directory Structure

```
.github/
├── statik.ai.QCS/
│   ├── README.md                   ← You are here
│   ├── package.json                # npm scripts (test, qa, generate)
│   │
│   ├── scripts/
│   │   ├── generate-sdf-index.js   # Generates docs/sdf-index.yaml
│   │   ├── check-docs.js           # CI: blocks merge if SDF docs not updated
│   │   ├── validate-schemas.js     # Validates JSON in schemas/ and configs/
│   │   └── validate-assets.js      # Validates assets/ per Assets.md spec
│   │
│   └── tests/sdf/
│       ├── test-generate-index.js  # 9 assertion groups (docs, mappings, layers, issues)
│       ├── test-check-docs.js      # 17 subsystem mapping tests
│       ├── test-validate-schemas.js# 6 tests (valid/invalid JSON, structure)
│       └── test-validate-assets.js # 10 tests (CSS, filenames, JSON id, icons)
│
└── workflows/
    └── docs-check.yml              # GitHub Actions — runs on PR & push to master
```

---

## Scripts

### `generate-sdf-index.js`

Generates `docs/sdf-index.yaml` — the machine-readable map of the entire system.

**Contains:**
- **113 file mappings** — exact repo paths, each with `primary` doc, `secondary` docs, `layer`, and `description`
- **22 SDF document metadata** — type (primary/cross/advisory), scope
- **17 known contradictions** — severity (high/medium/low), affected docs, description
- **Override support** — `docs/sdf-index.overrides.yaml` for edge-case mappings

**Usage:**
```bash
node .github/statik.ai.QCS/scripts/generate-sdf-index.js
# → writes docs/sdf-index.yaml
```

### `check-docs.js`

CI enforcement script. Given a list of changed files, checks whether the corresponding SDF docs were also updated in the same PR.

**Matching strategy (3-tier):**
1. **Exact path** — `src/kernel/kernel.u.js` → `Kernels.md` ✓
2. **Glob pattern** — `src/units/*.u.js` → `Units.md` ✓
3. **Directory prefix** — `src/kernel/new-file.js` → falls back to `Kernels.md` by longest prefix

**Exclusions:** `.github/**` (QA infra) and `docs/**` (non-SDF docs) are skipped.

**Usage:**
```bash
node .github/statik.ai.QCS/scripts/check-docs.js --files "src/kernel/kernel.u.js,src/bus/bus.u.js"
# Exit 0 = pass, Exit 1 = fail

# Bypass:
node .github/statik.ai.QCS/scripts/check-docs.js --docs-signoff
```

### `validate-schemas.js`

Validates JSON files in `schemas/` and `configs/`:
- JSON parse check (catches syntax errors)
- Schema structure: must have `type`, `$schema`, or `oneOf`/`anyOf`/`allOf`
- Object schemas must have `properties`
- Naming convention: schema files should use `.schema.json` extension
- Config files must be JSON objects

**Usage:**
```bash
# Full scan
node .github/statik.ai.QCS/scripts/validate-schemas.js

# Targeted
node .github/statik.ai.QCS/scripts/validate-schemas.js --files "schemas/messages/intent.schema.json"
```

### `validate-assets.js`

Validates files in `assets/` per the `Assets.md` specification:
- No spaces in filenames
- CSS files must be non-empty
- JSON asset files must have an `id` field
- Required styles: `base.css`, `chat.css`, `inspector.css`
- Required icons: `icon-72.png`, `icon-180.png`, `icon-512.png`, `background.png`
- Required directories: `assets/styles/`, `assets/icons/`, `assets/fonts/`

**Usage:**
```bash
# Full scan (includes structural checks)
node .github/statik.ai.QCS/scripts/validate-assets.js

# Targeted (individual file checks only)
node .github/statik.ai.QCS/scripts/validate-assets.js --files "assets/styles/base.css"
```

---

## Running Locally

```bash
cd .github/statik.ai.QCS

# Run all 4 test suites
npm test

# Run individual test suites
npm run test:index      # generate-sdf-index tests
npm run test:docs       # check-docs tests
npm run test:schemas    # validate-schemas tests
npm run test:assets     # validate-assets tests

# Full QA pipeline (generate → check → validate)
npm run qa

# Regenerate the SDF index
npm run generate-sdf-index
```

No `npm install` needed — zero external dependencies.

---

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/docs-check.yml`) runs on every PR and push to `master`:

| Step | Script | Trigger | Blocking |
|------|--------|---------|----------|
| Generate SDF index | `generate-sdf-index.js` | Always | Yes |
| Docs check | `check-docs.js` | Changed files exist | **Yes — blocks merge** |
| Schema validation | `validate-schemas.js` | `schemas/` or `configs/` changed | Yes |
| Asset validation | `validate-assets.js` | `assets/` changed | Yes |
| QA test suite | All 4 test files | Always | Yes |

### Bypassing the Docs Check

For emergency or low-risk changes, use one of:
- **`--docs-signoff` flag** in the check-docs step
- **`emergency` label** on the PR (must be followed by post-merge doc update)

---

## Architecture

### The 13 Layers

The 113 file mappings are organized into architectural layers:

| Layer | Files | Governing Docs |
|-------|-------|----------------|
| `root` | 5 | Root.Boot.md |
| `bootstrap` | 4 | BOOT.md, Root.Boot.md |
| `config` | 5 | Config.Schema.md, MESSAGES.md |
| `schema` | 9 | Config.Schema.md |
| `kernel` | 4 | Kernels.md |
| `bus` | 4 | Bus.RunTime.md |
| `runtime` | 4 | Bus.RunTime.md |
| `units` | 19 | Units.md |
| `workers` | 4 | Workers.md |
| `adapters` | 9 | Adapters.md |
| `storage` | 5 | Storage.VFS.md, STORAGE.md |
| `vfs` | 5 | Storage.VFS.md |
| `protocols` | 4 | Protocols.md |
| `ui` | 11 | UI.md |
| `utils` | 7 | Utils.md |
| `assets` | 7 | Assets.md |
| `tests` | 17 | Tests.md |

### Data Flow

```
SDF Docs (22 .md files)
     │
     ▼
generate-sdf-index.js ──→ docs/sdf-index.yaml
     │
     ├──→ check-docs.js      (file→doc enforcement)
     ├──→ validate-schemas.js (JSON structure)
     └──→ validate-assets.js  (asset rules)
            │
            ▼
     GitHub Actions CI (docs-check.yml)
            │
            ▼
     PR blocked or approved
```

---

## Contributing to QCS

When adding new files to the statik.ai repo:

1. **Add the file mapping** in `generate-sdf-index.js → FILE_MAPPINGS[]`:
   ```js
   { path: 'src/units/newunit.u.js', primary: 'Units.md', secondary: ['MESSAGES.md'], layer: 'units', description: 'New Unit' },
   ```

2. **Run the generator** to update `docs/sdf-index.yaml`:
   ```bash
   node .github/statik.ai.QCS/scripts/generate-sdf-index.js
   ```

3. **Run the tests** to verify:
   ```bash
   npm test --prefix .github/statik.ai.QCS
   ```

4. **Update test expectations** if the total file/doc count changes (in `test-generate-index.js`).

When resolving a known contradiction:
1. Fix the SDF doc(s) in `docs/SDF.RETYE.AF.master/`
2. Remove the resolved issue from `KNOWN_ISSUES[]` in `generate-sdf-index.js`
3. Update the `EXPECTED_KNOWN_ISSUES` count in `test-generate-index.js`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Feb 2026 | SOTA rewrite — 113 exact file mappings, 22 docs, 17 known issues, 3-tier matching, asset/schema validators, full test suite |
| 1.0.0 | Feb 2026 | Initial QCS — glob-based mappings, basic check-docs, relocated from repo root to `.github/` |

---

<div align="center">

*Quality assurance **for** the repo — not **in** the repo.*

**statik.ai.QCS v2.0.0** · Node.js ≥18 · Zero Dependencies

</div>
