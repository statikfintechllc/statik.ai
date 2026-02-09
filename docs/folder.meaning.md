# SDF.RETYE.AF.master

Means:
- **SDF:** Source Docs Folder
- **RETYE:** Read Every Time You Edit
- **AF:** Any File
- **master:** Master Copy

---

## For AI Agents

> **If you are an AI agent (Copilot, Claude, Gemini, or any autonomous builder), read this entire file before writing code.** This is the governance contract that keeps the 22 SDF specifications and 102+ source files aligned. Violations are blocked by CI.

**Quick start:** Read this file → Read `docs/BUILD.md` → Read the SDF doc for whatever file you're about to edit → Edit the source → Update the SDF doc → Push.

---

## Repo Folder Semantics & Required Procedures

**Purpose:** Clear, human-readable intent for each top-level folder and machine-enforceable rules to keep docs and code aligned.

**Folder map:**

| Folder | Purpose | Governing SDF Doc(s) |
|--------|---------|---------------------|
| `src/` | Implementation. All changes affecting behavior must include tests and a reference to the corresponding SDF doc(s). | Per-subsystem: `Kernels.md`, `Bus.RunTime.md`, `Units.md`, `Workers.md`, `Adapters.md`, `Storage.VFS.md`, `Protocols.md`, `UI.md`, `Utils.md` |
| `docs/SDF.RETYE.AF.master/` | **Authoritative source of truth** — 22 markdown specifications defining every file, interface, bus topic, schema, and boot sequence. **Read Every Time You Edit.** | Self-governing |
| `docs/` | Non-SDF documentation: `BUILD.md` (build instructions), `folder.meaning.md` (this file), `README.md` (project overview), and auto-generated `sdf-index.yaml`. | `Root.Boot.md`, `STRUCTURE.md` |
| `bootstrap/` | Cold-start boot orchestration: detect → hydrate → recover → boot. | `BOOT.md`, `Root.Boot.md` |
| `configs/` | Runtime configuration (4 JSON files): unit registry, capabilities, constraints, defaults. | `Config.Schema.md` |
| `schemas/` | JSON schemas (9 files) for bus messages, storage records, and system state. | `Config.Schema.md`, `MESSAGES.md` |
| `assets/` | Icons, stylesheets (CSS), fonts, design tokens. | `Assets.md` |
| `tests/` | Executable specs: unit, integration, and e2e tests. Required before merging functional changes. | `Tests.md` |
| `.github/statik.ai.QCS/` | **Quality Control System** — CI scripts, validators, and test suites that enforce SDF alignment. Lives outside the repo source tree. See `.github/statik.ai.QCS/README.md`. | N/A (QCS governs, not governed) |
| `.github/workflows/` | GitHub Actions CI configuration. Runs SDF checks on every PR and push to `master`. | N/A |

**Root files:**

| File | Purpose | Governing SDF Doc |
|------|---------|-------------------|
| `index.html` | PWA entry point — `#app`, `#inspector`, `#debug` mounts | `Root.Boot.md` |
| `manifest.json` | PWA manifest — name, icons, shortcuts, file handlers | `Root.Boot.md`, `Assets.md` |
| `sw.js` | Service worker — cache-first, pre-cache, background sync | `Root.Boot.md`, `STORAGE.md` |
| `sfti.iso` | Self-bootstrapping snapshot (JSON, not actual ISO) | `ISO.md` |

---

## Procedures & Governance

### The RETYE Rule

**When editing a file that affects behavior, you MUST:**

1. **Before editing:** Read the file's governing SDF doc(s). Find them via:
   - The table above, OR
   - `docs/sdf-index.yaml` (auto-generated), OR
   - `FILE_MAPPINGS` in `.github/statik.ai.QCS/scripts/generate-sdf-index.js`

2. **During editing:** Follow the spec. If you need to deviate, document the deviation in the PR.

3. **After editing:** Update the SDF doc(s) if behavior changed, OR add a clear PR note explaining why no doc change was required.

This is **enforced by the `docs-check` CI job**, which maps changed files → SDF docs and blocks merge when docs are stale.

### Pre-Edit Checklist

- [ ] Read the governing SDF doc(s) for the file(s) you're touching
- [ ] Check `.github/statik.ai.QCS/scripts/generate-sdf-index.js → KNOWN_ISSUES` for contradictions
- [ ] Run existing tests: `node tests/unit/setup.js` (when test files exist)
- [ ] Ensure docs are referenced or updated
- [ ] Add or update tests as needed
- [ ] Run QCS locally: `npm test --prefix .github/statik.ai.QCS`

### Merge Gating

| Check | Tool | Blocking? |
|-------|------|-----------|
| SDF doc alignment | `.github/statik.ai.QCS/scripts/check-docs.js` | **Yes** |
| Schema validation | `.github/statik.ai.QCS/scripts/validate-schemas.js` | Yes (if schemas/ or configs/ changed) |
| Asset validation | `.github/statik.ai.QCS/scripts/validate-assets.js` | Yes (if assets/ changed) |
| QCS test suite | 4 test files in `.github/statik.ai.QCS/tests/sdf/` | Yes |
| `autonomy-` changes | Require `autonomy-change` label, 2 human approvals (including security/infra reviewer), documented risk assessment | **Yes** |

### Emergency & Low-Risk Changes

For emergency or low-risk changes:
- Include an `emergency` tag and a short justification in the PR
- These **must** be followed by a post-merge doc update within 48 hours
- Add an incident note to the relevant SDF doc

---

## Index & Mapping System

The repository maintains a machine-readable index of all file → SDF doc relationships:

### `docs/sdf-index.yaml` (auto-generated)

- Generated by `.github/statik.ai.QCS/scripts/generate-sdf-index.js`
- Contains **113 exact file-path mappings** across **13 architectural layers**
- Each mapping includes: `path`, `primary` doc, `secondary` docs, `layer`, `description`
- Includes **22 SDF document metadata** (type: primary/cross/advisory, scope)
- Includes **17 catalogued cross-doc contradictions** (severity + affected docs)

### `docs/sdf-index.overrides.yaml` (manual)

- Optional override file for edge-case mappings
- Supports manual `filePath: DocName.md` entries
- Checked by the generator at runtime

### When Adding New Files

1. Add the file mapping in `.github/statik.ai.QCS/scripts/generate-sdf-index.js → FILE_MAPPINGS[]`
2. Run `node .github/statik.ai.QCS/scripts/generate-sdf-index.js` to regenerate the index
3. Update the mapping count expectation in `.github/statik.ai.QCS/tests/sdf/test-generate-index.js` if needed
4. Commit `docs/sdf-index.yaml` alongside the new file

---

## Known Cross-Doc Contradictions

17 contradictions exist across the 22 SDF docs (as of QCS v2.0). These are **catalogued, not resolved**, to preserve the original specifications until the implementation phase forces a decision.

**High severity (5):** Bus topic naming conflicts between `Units.md` and `MESSAGES.md`, entry point mechanism conflict between `BOOT.md` and `Root.Boot.md`.

**Medium severity (6):** Validator signature mismatch, lifecycle method naming, migration scope differences.

**Low severity (6):** Unit count inconsistency in README, meta-text artifacts in Workers.md/Bus.RunTime.md.

Full list: `.github/statik.ai.QCS/scripts/generate-sdf-index.js → KNOWN_ISSUES[]`

**When resolving a contradiction:**
1. Pick the canonical spec (typically the subsystem-specific doc wins over cross-cutting docs)
2. Update **both** SDF docs to be consistent
3. Remove the resolved issue from `KNOWN_ISSUES[]`
4. Update `EXPECTED_KNOWN_ISSUES` in the test file

---

## Production Release Checklist

- [ ] Reproducible build (lockfile + Docker build, if applicable)
- [ ] SBOM generated
- [ ] SLSA attestation
- [ ] Signed release tag
- [ ] All QCS checks pass on `master`
- [ ] `docs/sdf-index.yaml` is current
- [ ] No HIGH severity known issues unresolved (or documented as accepted)
- [ ] `docs/BUILD.md` current with any process changes

---

## File Hierarchy

```
statik.ai/
├── docs/
│   ├── BUILD.md                    ← Build instructions (this system)
│   ├── folder.meaning.md           ← THIS FILE — governance rules
│   ├── README.md                   ← Project overview
│   ├── sdf-index.yaml              ← Auto-generated file→doc index
│   └── SDF.RETYE.AF.master/        ← 22 authoritative specifications
│       ├── STRUCTURE.md
│       ├── BOOT.md
│       ├── Root.Boot.md
│       ├── Kernels.md
│       ├── Bus.RunTime.md
│       ├── Units.md
│       ├── Workers.md
│       ├── Adapters.md
│       ├── MESSAGES.md
│       ├── STORAGE.md
│       ├── Storage.VFS.md
│       ├── Config.Schema.md
│       ├── Protocols.md
│       ├── UI.md
│       ├── Utils.md
│       ├── Assets.md
│       ├── Tests.md
│       ├── ISO.md
│       ├── iOS.md
│       ├── API.md
│       ├── ignore.IPA.md
│       └── README.md
├── .github/
│   ├── statik.ai.QCS/              ← Quality Control System
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── scripts/
│   │   │   ├── generate-sdf-index.js
│   │   │   ├── check-docs.js
│   │   │   ├── validate-schemas.js
│   │   │   └── validate-assets.js
│   │   └── tests/sdf/
│   │       ├── test-generate-index.js
│   │       ├── test-check-docs.js
│   │       ├── test-validate-schemas.js
│   │       └── test-validate-assets.js
│   └── workflows/
│       └── docs-check.yml
└── src/
    ├── kernel/     ← Kernels.md
    ├── bus/        ← Bus.RunTime.md
    ├── runtime/    ← Bus.RunTime.md
    ├── units/      ← Units.md
    ├── workers/    ← Workers.md
    ├── adapters/   ← Adapters.md
    ├── storage/    ← Storage.VFS.md
    ├── vfs/        ← Storage.VFS.md
    ├── protocols/  ← Protocols.md
    ├── ui/         ← UI.md
    ├── utils/      ← Utils.md
    └── bridge/     ← Units.md (bridge.u)
```

---

_Read this file before changing any other file; it describes the governance that keeps SDF.* and source aligned._
