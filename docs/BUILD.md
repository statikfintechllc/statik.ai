# Statik.ai — Build Instructions

**Target Audience:** AI agents (Copilot, Claude, Gemini, autonomous builders) and human developers  
**System:** Client-Side Agent Operating System (CSA.OS) — browser-native cognitive runtime  
**Strategy:** Docs-first → Kernel → Boot → Bridge → Expand incrementally  
**Runtime:** Vanilla JavaScript (ES2022+) — no bundler, no framework, no transpiler

---

## ⚠️ Before You Touch Anything

This is a **docs-first** codebase. The 22 specifications in `docs/SDF.RETYE.AF.master/` are the source of truth for every file, interface, and behavior in the system.

**RETYE = Read Every Time You Edit — Any File.**

### Mandatory Pre-Build Reading

| Order | File | Why |
|-------|------|-----|
| 1 | `docs/folder.meaning.md` | Governance rules, folder semantics, enforcement procedures |
| 2 | `docs/SDF.RETYE.AF.master/STRUCTURE.md` | Complete 102+ file directory tree — your build target |
| 3 | `docs/SDF.RETYE.AF.master/BOOT.md` | Cold-start boot sequence, Phase 0–4, timing constraints |
| 4 | `docs/SDF.RETYE.AF.master/Root.Boot.md` | Root files: `index.html`, `manifest.json`, `sw.js`, `bootstrap/` |
| 5 | `docs/SDF.RETYE.AF.master/Kernels.md` | Kernel internals: lifecycle, registry, watchdog |
| 6 | `docs/SDF.RETYE.AF.master/Bus.RunTime.md` | Message bus + runtime layer (scheduler, allocator, throttle) |

After reading these, you have enough context to build the critical path. Expand into additional SDF docs as you implement each subsystem.

### Quality Control

The repo enforces SDF alignment via `.github/statik.ai.QCS/` — an automated Quality Control System. See `.github/statik.ai.QCS/README.md` for full details. Key points:

- **CI blocks merge** if source files change without corresponding SDF doc updates
- **113 file → doc mappings** are maintained in `generate-sdf-index.js`
- **17 known cross-doc contradictions** are catalogued; check before implementing ambiguous specs
- Run `npm test --prefix .github/statik.ai.QCS` to validate QCS locally

---

## Build Strategy

### Philosophy

statik.ai is not a typical web app. It is a **cognitive operating system** that runs in a browser tab. Build it like you would build a microkernel OS:

1. **Kernel first** — message bus, unit registry, lifecycle manager, watchdog
2. **Bootstrap second** — environment detection, state hydration, boot orchestrator
3. **Bridge third** — remote debugging (so you can observe the system from outside)
4. **Cognitive units fourth** — the 19 specialized units, one at a time
5. **UI last** — the shell, chat, inspector panels

### Why This Order

```
Without kernel  → nothing initializes
Without boot    → nothing starts
Without bridge  → you cannot debug on target devices (especially iOS PWA)
Without units   → no cognition, but the system still runs
Without UI      → the system works headlessly, you just can't see it
```

---

## Phase 1: Core Kernel (Critical Path)

**Governing docs:** `Kernels.md`, `Bus.RunTime.md`, `BOOT.md`

### Build Order

```
1. src/bus/bus.u.js          ← Message bus (zero-coupling backbone)
2. src/bus/channels.js       ← Priority lanes (high/normal/low)
3. src/bus/router.js         ← Topic-based routing, wildcards
4. src/bus/validator.js      ← Schema validation for bus messages
5. src/kernel/kernel.u.js    ← Central orchestrator
6. src/kernel/lifecycle.js   ← Unit init/start/stop/restart
7. src/kernel/registry.js    ← Loads configs/units.registry.json
8. src/kernel/watchdog.js    ← Health monitor (5s interval, 3 strikes → disable)
```

### Architecture Constraint

**Units NEVER import each other.** All communication goes through the message bus:

```javascript
// ✗ WRONG — tight coupling
import { NlpUnit } from './nlp.u.js';
const nlp = new NlpUnit();
nlp.parse(text);

// ✓ CORRECT — loose coupling via bus
bus.emit('nlp.parse', { text });
bus.on('nlp.result', (result) => { /* ... */ });
```

### Unit Contract

Every unit must implement:
```javascript
export default class SomeUnit {
  constructor(bus) { this.bus = bus; }
  async init() { /* subscribe to bus topics, setup state */ }
  restoreState(state) { /* optional: restore from saved state */ }
  getState() { /* optional: return state for persistence */ }
}
```

---

## Phase 2: Bootstrap

**Governing docs:** `BOOT.md`, `Root.Boot.md`

### Build Order

```
1. bootstrap/detect.js       ← Environment + API detection → capabilities.json
2. bootstrap/hydrate.js      ← State restoration: IndexedDB → localStorage → defaults
3. bootstrap/recover.js      ← Safe mode recovery UI
4. bootstrap/boot.js         ← Main orchestrator: detect → hydrate → kernel.boot()
5. index.html                ← PWA entry: #app, #inspector, #debug mounts
6. manifest.json             ← PWA manifest: name, icons, shortcuts
7. sw.js                     ← Service worker: cache-first, pre-cache criticals
```

### Boot Sequence Target

```
T+0ms      index.html loads
T+50ms     DOM parsed, SW registered
T+170ms    bootstrap/boot.js module loaded
T+220ms    detect.js → capabilities
T+250ms    hydrate.js → state restored
T+255ms    boot mode determined (normal/degraded/safe)
T+272ms    bus initialized
T+292ms    registry loaded
T+392ms    19 units initialized (by priority)
T+402ms    system.ready emitted
T+452ms    UI rendered
T+492ms    BOOT COMPLETE (<500ms target)
```

---

## Phase 3: Debug Bridge

**Governing docs:** `Units.md` (bridge.u), `iOS.md`

### Build Order

```
1. src/units/bridge.u.js     ← Debug bridge unit
2. src/bridge/server.py      ← Python debug server (laptop-side)
```

### Why Bridge Before Units

When targeting iOS Safari (PWA mode), you have **no DevTools**. The bridge gives you:
- Remote `eval()` execution
- Screenshot capture
- State inspection
- Command queuing from laptop → phone

Build the bridge early so you can observe every subsequent unit as you implement it.

---

## Phase 4: Configs + Schemas

**Governing docs:** `Config.Schema.md`, `MESSAGES.md`

### Build Order

```
Configs (4 files):
1. configs/units.registry.json       ← Unit manifest: paths, deps, priority
2. configs/defaults.json             ← Default settings for first boot
3. configs/constraints.json          ← Resource limits: memory, CPU, messages
4. configs/capabilities.json         ← Written at runtime by detect.js

Schemas (9 files):
5. schemas/messages/context.schema.json   ← ContextFrame
6. schemas/messages/intent.schema.json    ← Intent
7. schemas/messages/memory.schema.json    ← Memory store/retrieve
8. schemas/messages/action.schema.json    ← Action execution
9. schemas/storage/episodes.schema.json   ← Episodic memory
10. schemas/storage/concepts.schema.json  ← Semantic memory
11. schemas/storage/skills.schema.json    ← Procedural memory
12. schemas/state/unit.state.schema.json  ← Unit state snapshots
13. schemas/state/kernel.state.schema.json← Kernel state
```

---

## Phase 5: Cognitive Units (19 total)

**Governing docs:** `Units.md`, `MESSAGES.md`

### Build by Priority Group

**Core Perception (Priority 1–5):**
```
src/units/pce.u.js      ← Perception & Context Encoder
src/units/as.u.js       ← Attention & Salience
src/units/ti.u.js       ← Temporal Integrator
```

**Intelligence (Priority 6–10):**
```
src/units/nlp.u.js      ← Natural Language Processing
src/units/cm.u.js       ← Core Memory (episodic, semantic, procedural)
src/units/gm.u.js       ← Goals & Motivation (autonomy engine)
src/units/dbt.u.js      ← Delta & Learning Ledger
```

**Execution & Evaluation (Priority 11–15):**
```
src/units/sa.u.js       ← Self-Awareness
src/units/ie.u.js       ← Intent Execution
src/units/ee.u.js       ← Evaluation & Error
src/units/ec.u.js       ← Constraints & Ethics
```

**System Maintenance (Priority 16–20):**
```
src/units/hc.u.js       ← Homeostasis (stability)
src/units/ui.u.js       ← User Interface unit
src/units/telemetry.u.js← Observability
src/units/sync.u.js     ← Federation (P2P sync)
```

**Optional Features (Priority 21–25):**
```
src/units/dev.u.js      ← Developer Tools (if ?dev=true)
src/units/bridge.u.js   ← Debug Bridge (already built in Phase 3)
src/units/disc.u.js     ← Instance Discovery
src/units/mesh.u.js     ← P2P Mesh Networking
```

### ⚠️ Known Contradictions to Resolve During Build

Check `KNOWN_ISSUES` in `.github/statik.ai.QCS/scripts/generate-sdf-index.js` before implementing these units. The critical conflicts:

| Severity | Issue | Resolution Needed |
|----------|-------|-------------------|
| **HIGH** | NLP topics differ between `Units.md` and `MESSAGES.md` | Pick one, update both docs |
| **HIGH** | CM subscriptions differ between `Units.md` and `MESSAGES.md` | Pick one, update both docs |
| **HIGH** | DBT subscriptions differ between `Units.md` and `MESSAGES.md` | Pick one, update both docs |
| **HIGH** | EE subscriptions differ between `Units.md` and `MESSAGES.md` | Pick one, update both docs |
| **HIGH** | Entry point conflict between `Root.Boot.md` and `BOOT.md` | `BOOT.md` is canonical (boot.js IIFE) |
| MEDIUM | Validator signature mismatch | `Bus.RunTime.md` is canonical |
| MEDIUM | Kernel "never throws" vs throw in catch block | Allow throws in boot failure only |

---

## Phase 6: Storage + VFS

**Governing docs:** `STORAGE.md`, `Storage.VFS.md`

### Build Order

```
Storage (5 files):
1. src/storage/db.js          ← 3 IndexedDB databases (memory, state, logs)
2. src/storage/migrations.js  ← Schema migrations (sequential, idempotent)
3. src/storage/backup.js      ← Export/import, scheduled auto-backup
4. src/storage/opfs.js        ← OPFS: writeFile, readFile, streams
5. src/storage/cache.js       ← SW cache management

VFS (5 files):
6. src/vfs/vfs.js             ← Virtual File System: loadSourceTree, readFile, writeFile
7. src/vfs/tree.js            ← Directory tree: buildTree, findFile
8. src/vfs/editor.js          ← Monaco editor integration
9. src/vfs/loader.js          ← Dynamic import: loadModule, hotReload
10. src/vfs/snapshot.js        ← sfti.iso snapshot create/load
```

---

## Phase 7: Remaining Subsystems

### Workers (`Workers.md`)
```
src/workers/cognition.worker.js   ← Pattern matching, TF-IDF cosine similarity
src/workers/memory.worker.js      ← DB operations (runs in worker thread)
src/workers/nlp.worker.js         ← Tokenize, POS tag, entity extraction
src/workers/compute.worker.js     ← SHA-256, AES, vector math, statistics
```

### Adapters (`Adapters.md`, `iOS.md`)
```
src/adapters/ios/hardware.adapter.js       ← Camera, sensors, haptics
src/adapters/ios/storage.adapter.js        ← OPFS root, quota, persistent
src/adapters/ios/network.adapter.js        ← Online/offline, connection type
src/adapters/ios/permissions.adapter.js    ← Camera, mic, location, push
src/adapters/web/webgpu.adapter.js         ← WebGPU compute (if available)
src/adapters/web/indexeddb.adapter.js      ← IndexedDB abstraction
src/adapters/web/notifications.adapter.js  ← Web Notifications API
src/adapters/universal/crypto.adapter.js   ← WebCrypto: RSA-OAEP, hash, sign
src/adapters/universal/time.adapter.js     ← performance.now(), mark, measure
```

### Protocols (`Protocols.md`)
```
src/protocols/rpc.js          ← Request-response with correlation IDs
src/protocols/stream.js       ← AsyncIterator, backpressure
src/protocols/event.js        ← Fire-and-forget events
src/protocols/handshake.js    ← Unit init handshake (10s timeout)
```

### Utils (`Utils.md`)
```
src/utils/id.js         ← generateId(prefix), uuid() — timestamp-sortable
src/utils/time.js       ← now(), formatTimestamp, elapsedTime, sleep
src/utils/math.js       ← cosineSimilarity, normalize, dotProduct, mean
src/utils/hash.js       ← SHA-256 (async), simpleHash (sync dedup)
src/utils/validate.js   ← validate(data, schema), loadSchema
src/utils/logger.js     ← log(level, unit, msg), debug/info/error
src/utils/crypto.js     ← randomBytes, randomInt, encryptData(PBKDF2+AES)
```

---

## Phase 8: UI

**Governing docs:** `UI.md`, `Assets.md`

### Build Order
```
1. src/ui/shell.js                            ← Shell layout, theme switching
2. src/ui/chat.js                             ← Chat interface, markdown rendering
3. src/ui/inspector/memory.inspector.js       ← Memory panel (paginated, searchable)
4. src/ui/inspector/goals.inspector.js        ← Goals panel (real-time, color-coded)
5. src/ui/inspector/trace.inspector.js        ← Trace timeline view
6. src/ui/inspector/performance.inspector.js  ← Performance metrics, charts
7. src/ui/editor/monaco.loader.js             ← Monaco CDN loader (lazy)
8. src/ui/editor/file.browser.js              ← File browser tree nav
9. src/ui/controls/pause.js                   ← Pause/resume (Space shortcut)
10. src/ui/controls/reset.js                  ← Reset (state only vs everything)
11. src/ui/controls/export.js                 ← Export → backup.exportAllData()
```

### Assets (build alongside UI)
```
assets/styles/base.css        ← Core CSS: tokens, variables, reset, dark/light
assets/styles/chat.css        ← Chat bubbles, input, markdown
assets/styles/inspector.css   ← Inspector sidebar, tabs, accordion, mobile overlay
assets/icons/icon-72.png      ← PWA icon 72px
assets/icons/icon-180.png     ← iOS home screen icon 180px
assets/icons/icon-512.png     ← High-res icon for splash/store
assets/icons/background.png   ← User-provided background
assets/fonts/                 ← (empty dir, fonts loaded from CDN or system)
```

---

## Phase 9: Tests

**Governing doc:** `Tests.md`

```
tests/unit/setup.js                         ← Test framework: test() + assert(), zero deps
tests/unit/kernel.test.js                   ← Kernel unit tests
tests/unit/bus.test.js                      ← Bus unit tests
tests/unit/units/pce.test.js                ← PCE unit tests
tests/unit/units/nlp.test.js                ← NLP unit tests
tests/unit/units/cm.test.js                 ← Core Memory unit tests
tests/unit/utils/id.test.js                 ← ID utility tests
tests/unit/utils/math.test.js               ← Math utility tests
tests/integration/boot-sequence.test.js     ← Boot → Ready
tests/integration/message-flow.test.js      ← Input → Parse → Store → Respond
tests/integration/memory-learning.test.js   ← Memory + learning cycle
tests/integration/ui-interaction.test.js    ← UI interaction flows
tests/integration/bridge-commands.test.js   ← Bridge remote commands
tests/e2e/conversation.test.js              ← Full conversation flow
tests/e2e/memory-recall.test.js             ← Memory recall
tests/e2e/learning-loop.test.js             ← Learning loop
tests/e2e/offline-mode.test.js              ← Offline mode
```

---

## Serving & Running

statik.ai has **no build step**. It runs directly as ES modules in the browser.

```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: Node
npx serve .

# Option 3: VS Code Live Server extension

# Then open:
#   http://localhost:8080              (normal mode)
#   http://localhost:8080?dev=true     (developer tools enabled)
#   http://localhost:8080?debug=true   (debug bridge enabled)
#   http://localhost:8080?safe=true    (safe mode)
#   http://localhost:8080?reset=true   (clear all storage)
```

### iOS PWA Installation
1. Open URL in Safari (iOS 17.4+ required for OPFS)
2. Share → Add to Home Screen
3. Launch from home screen (runs standalone, offline-capable)

---

## For AI Agents: Build Checklist

When building files as an autonomous agent, follow this checklist for each file:

- [ ] **Read the SDF doc** — Find the `primary` doc for this file in `generate-sdf-index.js`
- [ ] **Check KNOWN_ISSUES** — If the file is mentioned in a contradiction, decide which spec to follow and note it
- [ ] **Follow the unit contract** — `constructor(bus)`, `async init()`, bus-only communication
- [ ] **No external imports** between units — all communication via `bus.emit()` / `bus.on()`
- [ ] **No external dependencies** — vanilla JS, Web APIs only
- [ ] **Export the class** as default export — `export default class UnitName`
- [ ] **Log with prefix** — `console.log('[unit.name] message')`
- [ ] **Implement `getState()`** if the unit has persistent state
- [ ] **Update the SDF doc** if you deviate from spec (or note the deviation)
- [ ] **Run QCS** — `npm test --prefix .github/statik.ai.QCS` after adding files

### SDF Doc Lookup

To find which doc governs a file:
```bash
# Method 1: Search the index
node -e "
  const {FILE_MAPPINGS} = require('./.github/statik.ai.QCS/scripts/generate-sdf-index.js');
  const m = FILE_MAPPINGS.find(m => m.path === 'src/kernel/kernel.u.js');
  console.log(m);
"

# Method 2: Check the generated index
cat docs/sdf-index.yaml | grep -A4 'kernel.u.js'
```

---

## Technology Constraints

| Constraint | Reason |
|------------|--------|
| **No npm packages** | Client-side only, must work in browser |
| **No bundler** (webpack, vite, etc.) | ES modules served directly, no build step |
| **No transpiler** (TypeScript, Babel) | Vanilla ES2022+, supported by all modern browsers |
| **No framework** (React, Vue, etc.) | Raw DOM manipulation, minimal footprint |
| **No external AI APIs** | Privacy-first, $0/month operating cost |
| **No server** (except `sw.js`) | Client-side only, OPFS + IndexedDB for persistence |
| **Node.js ≥18** for QCS scripts only | QCS runs in CI/dev, not in the browser runtime |

---

## Reference

| Resource | Location |
|----------|----------|
| SDF specifications | `docs/SDF.RETYE.AF.master/` (22 files) |
| Folder governance | `docs/folder.meaning.md` |
| QCS (Quality Control) | `.github/statik.ai.QCS/` |
| CI workflow | `.github/workflows/docs-check.yml` |
| Generated index | `docs/sdf-index.yaml` (auto-generated) |
| Project README | `docs/README.md` or root `README.md` |

---

_This document is itself governed by the SDF system. If you change the build process, update this file and the corresponding SDF docs._