#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// statik.ai.QCS — SOTA SDF Index Generator v2.0
// ──────────────────────────────────────────────────────────────────────────────
// Deep-analysed from all 22 SDF.RETYE.AF.master documents.
// Every file path, every governing doc, every cross-reference — verified.
//
// Usage:  node generate-sdf-index.js
// Output: docs/sdf-index.yaml  (REPO ROOT)
// ──────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Path resolution ─────────────────────────────────────────────────────────
// From: .github/statik.ai.QCS/scripts/  →  repo root (3 levels up)
const REPO_ROOT  = path.resolve(__dirname, '..', '..', '..');
const SDF_ROOT   = path.join(REPO_ROOT, 'docs', 'SDF.RETYE.AF.master');
const INDEX_OUT  = path.join(REPO_ROOT, 'docs', 'sdf-index.yaml');
const OVERRIDES  = path.join(REPO_ROOT, 'docs', 'sdf-index.overrides.yaml');

// ── All 22 SDF Documents ───────────────────────────────────────────────────
const SDF_DOCS = [
  'STRUCTURE.md',   'BOOT.md',        'Root.Boot.md',   'Kernels.md',
  'Bus.RunTime.md', 'Adapters.md',    'API.md',         'Assets.md',
  'Config.Schema.md','Workers.md',    'Protocols.md',   'MESSAGES.md',
  'STORAGE.md',     'Storage.VFS.md', 'Units.md',       'Utils.md',
  'UI.md',          'Tests.md',       'ISO.md',         'ignore.IPA.md',
  'iOS.md',         'README.md',
];

// ── Document Metadata ──────────────────────────────────────────────────────
// type: primary   = defines files in a specific subsystem
//       cross     = spans the entire system (structure / API / readme)
//       advisory  = informational / non-build (ignore.IPA, ISO overview)
const DOC_META = {
  'STRUCTURE.md':    { type: 'cross',    scope: 'Complete directory tree — authoritative file layout for all 102+ files' },
  'API.md':          { type: 'cross',    scope: 'All public interfaces, message bus API, unit APIs, performance guarantees, security policies' },
  'README.md':       { type: 'cross',    scope: 'Project overview, architecture, roadmap, getting started, configuration' },
  'BOOT.md':         { type: 'primary',  scope: 'Cold-start boot sequence: Phase 0-4, timing, init order, watchdog, safe mode' },
  'Root.Boot.md':    { type: 'primary',  scope: 'Per-file spec for root files (index.html, manifest.json, sw.js) and bootstrap/' },
  'Kernels.md':      { type: 'primary',  scope: 'src/kernel/ — kernel.u.js, lifecycle.js, registry.js, watchdog.js' },
  'Bus.RunTime.md':  { type: 'primary',  scope: 'src/bus/ (bus.u.js, channels, router, validator) and src/runtime/ (scheduler, allocator, quota, throttle)' },
  'Adapters.md':     { type: 'primary',  scope: 'src/adapters/ — iOS, Web, Universal platform adapters (9 files)' },
  'Assets.md':       { type: 'primary',  scope: 'assets/ — icons, stylesheets, fonts, CSS variables, design tokens' },
  'Config.Schema.md':{ type: 'primary',  scope: 'configs/ (4 JSON configs) and schemas/ (9 JSON schemas) — full field specs' },
  'Workers.md':      { type: 'primary',  scope: 'src/workers/ — 4 Web Workers: cognition, memory, nlp, compute' },
  'Protocols.md':    { type: 'primary',  scope: 'src/protocols/ — rpc, stream, event, handshake protocols' },
  'MESSAGES.md':     { type: 'primary',  scope: 'Cognitive message architecture: context lifecycle, NLP patterns, delta learning, self-training' },
  'STORAGE.md':      { type: 'primary',  scope: 'Multi-tier storage: IndexedDB schemas, OPFS layout, SW cache, quota, migrations, backups' },
  'Storage.VFS.md':  { type: 'primary',  scope: 'src/storage/ and src/vfs/ — per-file interface specs' },
  'Units.md':        { type: 'primary',  scope: 'src/units/ — all 19 cognitive units: bus topics, functions, state, behaviors' },
  'Utils.md':        { type: 'primary',  scope: 'src/utils/ — 7 utility modules: id, time, math, hash, validate, logger, crypto' },
  'UI.md':           { type: 'primary',  scope: 'src/ui/ — shell, chat, inspector panels, editor, controls (11 files)' },
  'Tests.md':        { type: 'primary',  scope: 'tests/ — unit/integration/e2e test strategy, directory structure, 20+ test files' },
  'ISO.md':          { type: 'advisory', scope: 'sfti.iso snapshot format — JSON structure, triggers, retention, restore' },
  'ignore.IPA.md':   { type: 'advisory', scope: 'sfti.ipa — declared infeasible, PWA-first recommendation' },
  'iOS.md':          { type: 'cross',    scope: 'iOS integration: PWA capabilities, storage, push, hardware, performance, debugging' },
};

// ── COMPLETE FILE → SDF DOCUMENT MAPPING ───────────────────────────────────
// Derived from exhaustive line-by-line reading of all 22 docs.
// Each entry: { path, primary, secondary[], layer, description }
//
// "primary"   = the SDF doc that DEFINES this file's spec
// "secondary" = docs that REFERENCE this file (cross-cutting or contextual)
// "layer"     = architectural layer for grouping
const FILE_MAPPINGS = [

  // ═══════════════ ROOT FILES ═══════════════════════════════════════════════
  { path: 'index.html',       primary: 'Root.Boot.md',     secondary: ['BOOT.md','STORAGE.md','iOS.md'],          layer: 'root',       description: 'PWA entry point — #app, #inspector, #debug mounting points' },
  { path: 'manifest.json',    primary: 'Root.Boot.md',     secondary: ['Assets.md','iOS.md'],                     layer: 'root',       description: 'PWA manifest — name, icons, shortcuts, file handlers, share target' },
  { path: 'sw.js',            primary: 'Root.Boot.md',     secondary: ['STORAGE.md','iOS.md'],                    layer: 'root',       description: 'Service worker — cache-first, pre-cache, background sync, push' },
  { path: 'README.md',        primary: 'Root.Boot.md',     secondary: [],                                         layer: 'root',       description: 'User-facing documentation' },
  { path: 'ARCHITECTURE.md',  primary: 'Root.Boot.md',     secondary: [],                                         layer: 'root',       description: 'Technical architecture documentation' },

  // ═══════════════ BOOTSTRAP ════════════════════════════════════════════════
  { path: 'bootstrap/boot.js',    primary: 'BOOT.md',      secondary: ['Root.Boot.md'],                           layer: 'bootstrap',  description: 'Main bootstrap orchestrator — async boot(), IIFE auto-execute' },
  { path: 'bootstrap/detect.js',  primary: 'BOOT.md',      secondary: ['Root.Boot.md'],                           layer: 'bootstrap',  description: 'Environment detection: platform, APIs, storage, capabilities' },
  { path: 'bootstrap/hydrate.js', primary: 'BOOT.md',      secondary: ['Root.Boot.md','STORAGE.md'],              layer: 'bootstrap',  description: 'State hydration from IndexedDB/localStorage/defaults' },
  { path: 'bootstrap/recover.js', primary: 'BOOT.md',      secondary: ['Root.Boot.md'],                           layer: 'bootstrap',  description: 'Safe mode recovery: reset, restore backup, continue anyway' },

  // ═══════════════ CONFIGS (4 files) ════════════════════════════════════════
  { path: 'configs/units.registry.json', primary: 'Config.Schema.md', secondary: ['BOOT.md','Kernels.md'],        layer: 'config',     description: 'Unit manifest: id, path, dependencies, priority, required' },
  { path: 'configs/capabilities.json',   primary: 'Config.Schema.md', secondary: ['BOOT.md','Root.Boot.md','Adapters.md'], layer: 'config', description: 'Runtime feature flags written by detect.js' },
  { path: 'configs/constraints.json',    primary: 'Config.Schema.md', secondary: ['Bus.RunTime.md','Units.md'],   layer: 'config',     description: 'Hard resource limits: memory, CPU, messages' },
  { path: 'configs/defaults.json',       primary: 'Config.Schema.md', secondary: ['BOOT.md','Root.Boot.md','STORAGE.md'], layer: 'config', description: 'Default settings for first boot / reset' },
  { path: 'configs/nlp-patterns-default.json', primary: 'MESSAGES.md', secondary: ['Units.md'],                   layer: 'config',     description: '5 default NLP patterns (greeting, query, command, help)' },

  // ═══════════════ SCHEMAS — Messages (4) ══════════════════════════════════
  { path: 'schemas/messages/context.schema.json', primary: 'Config.Schema.md', secondary: ['MESSAGES.md','Bus.RunTime.md'], layer: 'schema', description: 'ContextFrame: id, timestamp, source, raw, tokens, novelty_score' },
  { path: 'schemas/messages/intent.schema.json',  primary: 'Config.Schema.md', secondary: ['MESSAGES.md'],        layer: 'schema',     description: 'Intent: intent_type (query|command|statement), confidence, entities' },
  { path: 'schemas/messages/memory.schema.json',  primary: 'Config.Schema.md', secondary: ['MESSAGES.md'],        layer: 'schema',     description: 'Memory store/retrieve actions' },
  { path: 'schemas/messages/action.schema.json',  primary: 'Config.Schema.md', secondary: ['MESSAGES.md'],        layer: 'schema',     description: 'Action execution: action_type, target, payload' },

  // ═══════════════ SCHEMAS — Storage (3) ═══════════════════════════════════
  { path: 'schemas/storage/episodes.schema.json',  primary: 'Config.Schema.md', secondary: ['STORAGE.md','MESSAGES.md'], layer: 'schema', description: 'Episodic memory: id, timestamp, context, salience, tags' },
  { path: 'schemas/storage/concepts.schema.json',  primary: 'Config.Schema.md', secondary: ['STORAGE.md'],        layer: 'schema',     description: 'Semantic memory: id, name, definition, relations, confidence' },
  { path: 'schemas/storage/skills.schema.json',    primary: 'Config.Schema.md', secondary: ['STORAGE.md'],        layer: 'schema',     description: 'Procedural memory: id, name, procedure, success_rate' },

  // ═══════════════ SCHEMAS — State (2) ═════════════════════════════════════
  { path: 'schemas/state/unit.state.schema.json',   primary: 'Config.Schema.md', secondary: ['STORAGE.md'],       layer: 'schema',     description: 'Unit state snapshots: unit_id, state, last_updated' },
  { path: 'schemas/state/kernel.state.schema.json', primary: 'Config.Schema.md', secondary: ['STORAGE.md','BOOT.md'], layer: 'schema', description: 'Kernel state: boot_count, uptime, crashes, version' },

  // ═══════════════ KERNEL (4 files) ════════════════════════════════════════
  { path: 'src/kernel/kernel.u.js', primary: 'Kernels.md',  secondary: ['BOOT.md','STORAGE.md'],                  layer: 'kernel',     description: 'Central orchestrator: boot(), getStatus(), shutdown()' },
  { path: 'src/kernel/lifecycle.js', primary: 'Kernels.md', secondary: ['BOOT.md'],                               layer: 'kernel',     description: 'Unit lifecycle: initializeUnits(), start/stop/restartUnit()' },
  { path: 'src/kernel/registry.js', primary: 'Kernels.md',  secondary: ['BOOT.md','Config.Schema.md'],            layer: 'kernel',     description: 'Unit registry: loadRegistry(), getUnit(), registerUnit()' },
  { path: 'src/kernel/watchdog.js', primary: 'Kernels.md',  secondary: ['BOOT.md'],                               layer: 'kernel',     description: 'Health monitor: 5s interval, heartbeat, 3 strikes → disable' },

  // ═══════════════ BUS (4 files) ═══════════════════════════════════════════
  { path: 'src/bus/bus.u.js',    primary: 'Bus.RunTime.md', secondary: ['BOOT.md','MESSAGES.md'],                 layer: 'bus',        description: 'Core message bus: emit, on, request, stream — wildcards, priority' },
  { path: 'src/bus/channels.js', primary: 'Bus.RunTime.md', secondary: ['BOOT.md'],                               layer: 'bus',        description: 'Priority lanes: high/normal/low, backpressure >1000' },
  { path: 'src/bus/router.js',   primary: 'Bus.RunTime.md', secondary: ['BOOT.md'],                               layer: 'bus',        description: 'Message routing: pattern matching, async delivery, error isolation' },
  { path: 'src/bus/validator.js', primary: 'Bus.RunTime.md', secondary: ['BOOT.md','MESSAGES.md','Config.Schema.md'], layer: 'bus',     description: 'Schema validation — loads schemas/messages/*' },

  // ═══════════════ RUNTIME (4 files) ═══════════════════════════════════════
  { path: 'src/runtime/scheduler.js', primary: 'Bus.RunTime.md', secondary: [],                                   layer: 'runtime',    description: 'Task scheduling: priority queue, deadlines, CPU budget' },
  { path: 'src/runtime/allocator.js', primary: 'Bus.RunTime.md', secondary: ['STORAGE.md'],                       layer: 'runtime',    description: 'CPU/memory allocation: per-unit budgets, constraints.json' },
  { path: 'src/runtime/quota.js',     primary: 'Bus.RunTime.md', secondary: ['STORAGE.md','Storage.VFS.md'],      layer: 'runtime',    description: 'Storage quota: navigator.storage, persistent, enforce limits' },
  { path: 'src/runtime/throttle.js',  primary: 'Bus.RunTime.md', secondary: [],                                   layer: 'runtime',    description: 'Rate limiting: token bucket, adaptive, per-unit' },

  // ═══════════════ UNITS (19 cognitive units) ══════════════════════════════
  { path: 'src/units/pce.u.js',       primary: 'Units.md', secondary: ['BOOT.md','MESSAGES.md'],                  layer: 'units',      description: 'Perception & Context Encoder' },
  { path: 'src/units/as.u.js',        primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Attention & Salience' },
  { path: 'src/units/ti.u.js',        primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Temporal Integrator' },
  { path: 'src/units/gm.u.js',        primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Goals & Motivation' },
  { path: 'src/units/nlp.u.js',       primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Natural Language Processor' },
  { path: 'src/units/cm.u.js',        primary: 'Units.md', secondary: ['MESSAGES.md','STORAGE.md'],               layer: 'units',      description: 'Core Memory' },
  { path: 'src/units/dbt.u.js',       primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Delta & Learning Ledger' },
  { path: 'src/units/ee.u.js',        primary: 'Units.md', secondary: ['MESSAGES.md'],                            layer: 'units',      description: 'Evaluation & Error' },
  { path: 'src/units/sa.u.js',        primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Self-Awareness' },
  { path: 'src/units/ie.u.js',        primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Intent Execution' },
  { path: 'src/units/ec.u.js',        primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Constraints & Ethics' },
  { path: 'src/units/hc.u.js',        primary: 'Units.md', secondary: ['Bus.RunTime.md','STORAGE.md'],            layer: 'units',      description: 'Homeostasis' },
  { path: 'src/units/sync.u.js',      primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Sync & Federation' },
  { path: 'src/units/ui.u.js',        primary: 'Units.md', secondary: ['BOOT.md'],                                layer: 'units',      description: 'User Interface unit' },
  { path: 'src/units/telemetry.u.js', primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Telemetry' },
  { path: 'src/units/dev.u.js',       primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Developer Tools' },
  { path: 'src/units/bridge.u.js',    primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Debug Bridge' },
  { path: 'src/units/disc.u.js',      primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'Discovery' },
  { path: 'src/units/mesh.u.js',      primary: 'Units.md', secondary: [],                                         layer: 'units',      description: 'P2P Mesh' },

  // ═══════════════ WORKERS (4 Web Workers) ═════════════════════════════════
  { path: 'src/workers/cognition.worker.js', primary: 'Workers.md', secondary: [],                                layer: 'workers',    description: 'Heavy compute: pattern matching, TF-IDF cosine similarity' },
  { path: 'src/workers/memory.worker.js',    primary: 'Workers.md', secondary: ['STORAGE.md'],                    layer: 'workers',    description: 'DB operations: store, retrieve, delete, bulk — IndexedDB' },
  { path: 'src/workers/nlp.worker.js',       primary: 'Workers.md', secondary: [],                                layer: 'workers',    description: 'Language: tokenize, POS tag, entity extraction, sentiment' },
  { path: 'src/workers/compute.worker.js',   primary: 'Workers.md', secondary: [],                                layer: 'workers',    description: 'Math & crypto: SHA-256, AES, vector math, statistics' },

  // ═══════════════ ADAPTERS — iOS (4) ═════════════════════════════════════
  { path: 'src/adapters/ios/hardware.adapter.js',    primary: 'Adapters.md', secondary: ['iOS.md'],               layer: 'adapters',   description: 'iOS hardware: camera, sensors, haptics, geo, battery' },
  { path: 'src/adapters/ios/storage.adapter.js',     primary: 'Adapters.md', secondary: ['iOS.md','STORAGE.md'],  layer: 'adapters',   description: 'iOS storage: OPFS root, quota, persistent storage' },
  { path: 'src/adapters/ios/network.adapter.js',     primary: 'Adapters.md', secondary: ['iOS.md'],               layer: 'adapters',   description: 'Network: online/offline, connection type, bandwidth' },
  { path: 'src/adapters/ios/permissions.adapter.js', primary: 'Adapters.md', secondary: ['iOS.md'],               layer: 'adapters',   description: 'Permissions: camera, mic, location, notifications' },

  // ═══════════════ ADAPTERS — Web (3) ═════════════════════════════════════
  { path: 'src/adapters/web/webgpu.adapter.js',        primary: 'Adapters.md', secondary: [],                     layer: 'adapters',   description: 'WebGPU compute: pipeline, similarity search, batch ops' },
  { path: 'src/adapters/web/indexeddb.adapter.js',     primary: 'Adapters.md', secondary: ['Storage.VFS.md'],     layer: 'adapters',   description: 'IndexedDB abstraction: open, transaction, query' },
  { path: 'src/adapters/web/notifications.adapter.js', primary: 'Adapters.md', secondary: ['iOS.md'],             layer: 'adapters',   description: 'Web Notifications API' },

  // ═══════════════ ADAPTERS — Universal (2) ════════════════════════════════
  { path: 'src/adapters/universal/crypto.adapter.js', primary: 'Adapters.md', secondary: [],                      layer: 'adapters',   description: 'WebCrypto: RSA-OAEP, hash, sign/verify' },
  { path: 'src/adapters/universal/time.adapter.js',   primary: 'Adapters.md', secondary: [],                      layer: 'adapters',   description: 'High-precision timing: performance.now(), mark, measure' },

  // ═══════════════ STORAGE (5 files) ══════════════════════════════════════
  { path: 'src/storage/db.js',         primary: 'Storage.VFS.md', secondary: ['STORAGE.md'],                      layer: 'storage',    description: '3 IndexedDB databases (memory, state, logs)' },
  { path: 'src/storage/migrations.js', primary: 'Storage.VFS.md', secondary: ['STORAGE.md'],                      layer: 'storage',    description: 'Schema migrations: sequential, idempotent, rollback' },
  { path: 'src/storage/backup.js',     primary: 'Storage.VFS.md', secondary: ['STORAGE.md'],                      layer: 'storage',    description: 'Export/import: exportAllData → blob, scheduleAutoBackup' },
  { path: 'src/storage/opfs.js',       primary: 'Storage.VFS.md', secondary: ['STORAGE.md','iOS.md'],             layer: 'storage',    description: 'OPFS: writeFile, readFile, streams, persistent, private' },
  { path: 'src/storage/cache.js',      primary: 'Storage.VFS.md', secondary: ['STORAGE.md'],                      layer: 'storage',    description: 'SW cache: cacheAssets, stale-while-revalidate' },

  // ═══════════════ VFS (5 files) ══════════════════════════════════════════
  { path: 'src/vfs/vfs.js',      primary: 'Storage.VFS.md', secondary: ['STORAGE.md'],                            layer: 'vfs',        description: 'Virtual File System: loadSourceTree, readFile, writeFile' },
  { path: 'src/vfs/tree.js',     primary: 'Storage.VFS.md', secondary: [],                                        layer: 'vfs',        description: 'Directory tree: buildTree, findFile, getChildren' },
  { path: 'src/vfs/editor.js',   primary: 'Storage.VFS.md', secondary: [],                                        layer: 'vfs',        description: 'Monaco editor integration: open, save, diff, format' },
  { path: 'src/vfs/loader.js',   primary: 'Storage.VFS.md', secondary: [],                                        layer: 'vfs',        description: 'Dynamic import: loadModule, reloadModule, hotReload' },
  { path: 'src/vfs/snapshot.js', primary: 'Storage.VFS.md', secondary: ['STORAGE.md','ISO.md'],                   layer: 'vfs',        description: 'Snapshots: createSnapshot → sfti.iso, loadSnapshot' },

  // ═══════════════ PROTOCOLS (4 files) ════════════════════════════════════
  { path: 'src/protocols/rpc.js',       primary: 'Protocols.md', secondary: [],                                    layer: 'protocols',  description: 'Request-response: ID correlation, timeout' },
  { path: 'src/protocols/stream.js',    primary: 'Protocols.md', secondary: [],                                    layer: 'protocols',  description: 'Streaming: AsyncIterator, backpressure' },
  { path: 'src/protocols/event.js',     primary: 'Protocols.md', secondary: [],                                    layer: 'protocols',  description: 'Fire-and-forget events' },
  { path: 'src/protocols/handshake.js', primary: 'Protocols.md', secondary: ['BOOT.md'],                           layer: 'protocols',  description: 'Unit init handshake: unit.init → unit.ready (10s)' },

  // ═══════════════ UI (11 files) ═════════════════════════════════════════
  { path: 'src/ui/shell.js',                          primary: 'UI.md', secondary: ['BOOT.md'],                    layer: 'ui',         description: 'Shell layout: renderShell, toggleInspector, setTheme' },
  { path: 'src/ui/chat.js',                           primary: 'UI.md', secondary: ['BOOT.md'],                    layer: 'ui',         description: 'Chat: appendMessage, handleUserInput, markdown' },
  { path: 'src/ui/inspector/memory.inspector.js',     primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Memory panel: paginated, searchable, sortable' },
  { path: 'src/ui/inspector/goals.inspector.js',      primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Goals panel: real-time, color-coded priority' },
  { path: 'src/ui/inspector/trace.inspector.js',      primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Trace panel: timeline view, flow diagram' },
  { path: 'src/ui/inspector/performance.inspector.js',primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Performance panel: live metrics, charts' },
  { path: 'src/ui/editor/monaco.loader.js',           primary: 'UI.md', secondary: ['Storage.VFS.md'],             layer: 'ui',         description: 'Monaco CDN loader: lazy load, configure JS' },
  { path: 'src/ui/editor/file.browser.js',            primary: 'UI.md', secondary: ['Storage.VFS.md'],             layer: 'ui',         description: 'File browser: tree nav, rename, delete' },
  { path: 'src/ui/controls/pause.js',                 primary: 'UI.md', secondary: ['BOOT.md'],                    layer: 'ui',         description: 'Pause/resume: togglePause, Space shortcut' },
  { path: 'src/ui/controls/reset.js',                 primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Reset: confirm, state only vs everything' },
  { path: 'src/ui/controls/export.js',                primary: 'UI.md', secondary: [],                             layer: 'ui',         description: 'Export button: → backup.exportAllData()' },

  // ═══════════════ UTILS (7 files) ═══════════════════════════════════════
  { path: 'src/utils/id.js',       primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'ID: generateId(prefix), uuid() — timestamp-sortable' },
  { path: 'src/utils/time.js',     primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'Time: now(), formatTimestamp, elapsedTime, sleep' },
  { path: 'src/utils/math.js',     primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'Math: cosineSimilarity, normalize, dotProduct, mean' },
  { path: 'src/utils/hash.js',     primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'Hash: SHA-256 (async), simpleHash (sync dedup)' },
  { path: 'src/utils/validate.js', primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'Validate: validate(data, schema), loadSchema' },
  { path: 'src/utils/logger.js',   primary: 'Utils.md', secondary: [],                                             layer: 'utils',      description: 'Logger: log(level, unit, msg), debug/info/error' },
  { path: 'src/utils/crypto.js',   primary: 'Utils.md', secondary: ['STORAGE.md'],                                 layer: 'utils',      description: 'Crypto: randomBytes, randomInt, encryptData(PBKDF2+AES)' },

  // ═══════════════ ASSETS ════════════════════════════════════════════════
  { path: 'assets/icons/icon-72.png',    primary: 'Assets.md', secondary: ['iOS.md'],                              layer: 'assets',     description: 'PWA icon 72px, PNG w/ transparency' },
  { path: 'assets/icons/icon-180.png',   primary: 'Assets.md', secondary: ['iOS.md','BOOT.md'],                    layer: 'assets',     description: 'iOS home screen icon 180px, no transparency' },
  { path: 'assets/icons/icon-512.png',   primary: 'Assets.md', secondary: [],                                      layer: 'assets',     description: 'High-res icon 512px for splash/store' },
  { path: 'assets/icons/background.png', primary: 'Assets.md', secondary: [],                                      layer: 'assets',     description: 'User-provided background image' },
  { path: 'assets/styles/base.css',      primary: 'Assets.md', secondary: ['BOOT.md','STORAGE.md','iOS.md'],       layer: 'assets',     description: 'Core CSS: tokens, variables, reset, dark/light' },
  { path: 'assets/styles/chat.css',      primary: 'Assets.md', secondary: [],                                      layer: 'assets',     description: 'Chat styles: bubbles, input, markdown' },
  { path: 'assets/styles/inspector.css', primary: 'Assets.md', secondary: [],                                      layer: 'assets',     description: 'Inspector: sidebar, tabs, accordion, mobile overlay' },

  // ═══════════════ TESTS (20 files) ═════════════════════════════════════
  { path: 'tests/unit/setup.js',                          primary: 'Tests.md', secondary: [],                      layer: 'tests',      description: 'Test framework: test() and assert() — zero deps' },
  { path: 'tests/unit/kernel.test.js',                    primary: 'Tests.md', secondary: ['Kernels.md'],          layer: 'tests',      description: 'Kernel unit tests' },
  { path: 'tests/unit/bus.test.js',                       primary: 'Tests.md', secondary: ['Bus.RunTime.md'],      layer: 'tests',      description: 'Bus unit tests' },
  { path: 'tests/unit/units/pce.test.js',                 primary: 'Tests.md', secondary: ['Units.md'],            layer: 'tests',      description: 'PCE unit test' },
  { path: 'tests/unit/units/nlp.test.js',                 primary: 'Tests.md', secondary: ['Units.md','MESSAGES.md'], layer: 'tests',   description: 'NLP unit test' },
  { path: 'tests/unit/units/cm.test.js',                  primary: 'Tests.md', secondary: ['Units.md','STORAGE.md'], layer: 'tests',    description: 'Core Memory unit test' },
  { path: 'tests/unit/utils/id.test.js',                  primary: 'Tests.md', secondary: ['Utils.md'],            layer: 'tests',      description: 'ID utility test' },
  { path: 'tests/unit/utils/math.test.js',                primary: 'Tests.md', secondary: ['Utils.md'],            layer: 'tests',      description: 'Math utility test' },
  { path: 'tests/integration/boot-sequence.test.js',      primary: 'Tests.md', secondary: ['BOOT.md'],             layer: 'tests',      description: 'Integration: Boot → Ready' },
  { path: 'tests/integration/message-flow.test.js',       primary: 'Tests.md', secondary: ['MESSAGES.md','Bus.RunTime.md'], layer: 'tests', description: 'Integration: Input → Parse → Store → Respond' },
  { path: 'tests/integration/memory-learning.test.js',    primary: 'Tests.md', secondary: ['MESSAGES.md','STORAGE.md'], layer: 'tests', description: 'Integration: Memory + learning cycle' },
  { path: 'tests/integration/ui-interaction.test.js',     primary: 'Tests.md', secondary: ['UI.md'],               layer: 'tests',      description: 'Integration: UI interaction flows' },
  { path: 'tests/integration/bridge-commands.test.js',    primary: 'Tests.md', secondary: ['Units.md'],            layer: 'tests',      description: 'Integration: Bridge remote commands' },
  { path: 'tests/e2e/conversation.test.js',               primary: 'Tests.md', secondary: ['MESSAGES.md'],         layer: 'tests',      description: 'E2E: Full conversation' },
  { path: 'tests/e2e/memory-recall.test.js',              primary: 'Tests.md', secondary: ['STORAGE.md'],          layer: 'tests',      description: 'E2E: Memory recall' },
  { path: 'tests/e2e/learning-loop.test.js',              primary: 'Tests.md', secondary: ['MESSAGES.md'],         layer: 'tests',      description: 'E2E: Learning loop' },
  { path: 'tests/e2e/offline-mode.test.js',               primary: 'Tests.md', secondary: ['iOS.md','STORAGE.md'], layer: 'tests',      description: 'E2E: Offline mode' },

  // ═══════════════ BUILD ARTIFACTS ════════════════════════════════════════
  { path: 'sfti.iso',  primary: 'ISO.md', secondary: ['Storage.VFS.md','STORAGE.md'],                             layer: 'artifact',   description: 'Self-bootstrapping snapshot (JSON, not actual ISO)' },

  // ═══════════════ DOCS (output copies) ══════════════════════════════════
  { path: 'docs/API.md',      primary: 'API.md',      secondary: [],                                              layer: 'docs',       description: 'API documentation output' },
  { path: 'docs/BOOT.md',     primary: 'BOOT.md',     secondary: [],                                              layer: 'docs',       description: 'Boot sequence output' },
  { path: 'docs/MESSAGES.md', primary: 'MESSAGES.md',  secondary: [],                                             layer: 'docs',       description: 'Message format output' },
  { path: 'docs/STORAGE.md',  primary: 'STORAGE.md',  secondary: [],                                              layer: 'docs',       description: 'Storage output' },
  { path: 'docs/IOS.md',      primary: 'iOS.md',      secondary: [],                                              layer: 'docs',       description: 'iOS documentation output' },
];

// ── KNOWN CONTRADICTIONS (discovered during deep analysis) ─────────────────
const KNOWN_ISSUES = [
  { severity: 'high',   docs: ['BOOT.md','Root.Boot.md'],          issue: 'Entry point conflict: Root.Boot.md says index.html imports kernel.u.js; BOOT.md says bootstrap/boot.js' },
  { severity: 'high',   docs: ['Units.md','MESSAGES.md'],          issue: 'NLP topics differ: Units.md=intent.parse/intent.parsed; MESSAGES.md=nlp.parse/ui.render' },
  { severity: 'high',   docs: ['Units.md','MESSAGES.md'],          issue: 'CM subs differ: Units.md=memory.store/retrieve; MESSAGES.md=context.temporal' },
  { severity: 'high',   docs: ['Units.md','MESSAGES.md'],          issue: 'DBT subs differ: Units.md=pattern.result/skill.result; MESSAGES.md=error.detected/success.confirmed' },
  { severity: 'high',   docs: ['Units.md','MESSAGES.md'],          issue: 'EE subs differ: Units.md=action.executed/prediction.made; MESSAGES.md=action.execute/action.completed' },
  { severity: 'medium', docs: ['Kernels.md','BOOT.md'],            issue: 'Kernel "never throws" contradicted by throw in BOOT.md catch block' },
  { severity: 'medium', docs: ['Kernels.md','BOOT.md'],            issue: 'Lifecycle method: Kernels.md=initializeUnits(); BOOT.md=start()' },
  { severity: 'medium', docs: ['BOOT.md','Bus.RunTime.md'],        issue: 'Validator sig: BOOT.md=validate(topic,payload); Bus.RunTime.md=validate(message,schemaName)' },
  { severity: 'medium', docs: ['Config.Schema.md','API.md'],       issue: 'Action types: Config.Schema.md=underscore; API.md=dot notation + extra eval.code' },
  { severity: 'medium', docs: ['STORAGE.md','Storage.VFS.md'],     issue: 'Migration v1 scope: STORAGE.md=3 stores; Storage.VFS.md=2 stores' },
  { severity: 'medium', docs: ['STORAGE.md','Storage.VFS.md'],     issue: 'Snapshot name: STORAGE.md=statik-YYYYMMDD; Storage.VFS.md=sfti.iso' },
  { severity: 'low',    docs: ['README.md'],                       issue: 'Unit count: heading says 17, table lists 19, Features says 19' },
  { severity: 'low',    docs: ['STRUCTURE.md','README.md'],        issue: 'deploy.u.js and dns.u.js in memories but absent from all SDF docs' },
  { severity: 'low',    docs: ['BOOT.md'],                         issue: 'Watchdog.failures Map used but never initialized in constructor' },
  { severity: 'low',    docs: ['Utils.md','STORAGE.md'],           issue: 'crypto.js scope: Utils.md=randomBytes/Int; STORAGE.md adds encrypt/decrypt' },
  { severity: 'low',    docs: ['Workers.md'],                      issue: 'Meta-text left: "Token check: ~4000 tokens. Continue..."' },
  { severity: 'low',    docs: ['Bus.RunTime.md'],                  issue: 'Meta-text left: "Token check: Continue?"' },
];

// ══════════════════════════════════════════════════════════════════════════════
// YAML SERIALIZER (no external deps)
// ══════════════════════════════════════════════════════════════════════════════

function yamlStr(s) {
  if (/[:\[\]{},#&*!|>'"%@`\n]/.test(s) || s.trim() !== s || s === '') {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    for (const item of obj) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        out += `${pad}-\n`;
        for (const [k, v] of Object.entries(item)) {
          if (Array.isArray(v) && v.every(i => typeof i === 'string')) {
            out += `${pad}  ${k}: [${v.map(yamlStr).join(', ')}]\n`;
          } else if (typeof v === 'object' && v !== null) {
            out += `${pad}  ${k}:\n${toYaml(v, indent + 2)}`;
          } else {
            out += `${pad}  ${k}: ${yamlStr(String(v))}\n`;
          }
        }
      } else {
        out += `${pad}- ${yamlStr(String(item))}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && v.every(i => typeof i === 'string')) {
        out += `${pad}${k}: [${v.map(yamlStr).join(', ')}]\n`;
      } else if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        out += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      } else {
        out += `${pad}${k}: ${yamlStr(String(v))}\n`;
      }
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE YAML PARSER (for overrides)
// ══════════════════════════════════════════════════════════════════════════════

function parseSimpleYaml(text) {
  const result = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const kv = trimmed.match(/^([\w./-]+)\s*:\s*(.+)$/);
    if (kv) {
      const [, key, val] = kv;
      if (val.startsWith('[') && val.endsWith(']')) {
        result[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        result[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

function generate() {
  console.log('statik.ai.QCS — SDF Index Generator v2.0');
  console.log('─'.repeat(60));

  // Validate SDF docs exist
  const missing = [];
  for (const doc of SDF_DOCS) {
    if (!fs.existsSync(path.join(SDF_ROOT, doc))) missing.push(doc);
  }
  if (missing.length > 0) {
    console.warn(`⚠  Missing SDF docs: ${missing.join(', ')}`);
  }

  // Load overrides
  let overrides = {};
  if (fs.existsSync(OVERRIDES)) {
    try {
      overrides = parseSimpleYaml(fs.readFileSync(OVERRIDES, 'utf8'));
      console.log(`  Loaded ${Object.keys(overrides).length} override(s)`);
    } catch (e) {
      console.warn(`  ⚠ Failed to parse overrides: ${e.message}`);
    }
  }

  // Compute layer counts
  const layers = {};
  for (const m of FILE_MAPPINGS) {
    layers[m.layer] = (layers[m.layer] || 0) + 1;
  }

  // Build index
  const now = new Date().toISOString();
  const index = {
    meta: {
      version: '2.0.0',
      generated: now,
      generator: '.github/statik.ai.QCS/scripts/generate-sdf-index.js',
      sdf_root: 'docs/SDF.RETYE.AF.master',
      total_sdf_docs: String(SDF_DOCS.length),
      total_mapped_files: String(FILE_MAPPINGS.length),
      total_layers: String(Object.keys(layers).length),
    },
    documents: {},
    cross_cutting: [],
    layers: {},
    mappings: [],
    known_issues: [],
  };

  // Doc metadata
  for (const doc of SDF_DOCS) {
    const meta = DOC_META[doc] || { type: 'unknown', scope: '' };
    index.documents[doc] = { type: meta.type, scope: meta.scope, exists: String(!missing.includes(doc)) };
    if (meta.type === 'cross') {
      index.cross_cutting.push({ doc, scope: meta.scope });
    }
  }

  // Layer counts
  for (const [layer, count] of Object.entries(layers).sort((a,b) => b[1] - a[1])) {
    index.layers[layer] = String(count);
  }

  // Mappings with override support
  for (const m of FILE_MAPPINGS) {
    index.mappings.push({
      path: m.path,
      primary: overrides[m.path] || m.primary,
      secondary: m.secondary,
      layer: m.layer,
      description: m.description,
    });
  }

  // Known issues
  for (const issue of KNOWN_ISSUES) {
    index.known_issues.push({ severity: issue.severity, docs: issue.docs, issue: issue.issue });
  }

  // Write
  const header = [
    '# ══════════════════════════════════════════════════════════════════════════════',
    '# STATIK.AI — SDF INDEX v2.0  (State of the Art)',
    '# ══════════════════════════════════════════════════════════════════════════════',
    '# Auto-generated by statik.ai.QCS — DO NOT EDIT MANUALLY',
    '# Override: docs/sdf-index.overrides.yaml',
    '#',
    '# Maps every repo file to its governing SDF documentation.',
    '# primary   = doc that DEFINES this file spec',
    '# secondary = docs that REFERENCE this file',
    '# layer     = architectural grouping',
    '#',
    `# Total docs:  ${SDF_DOCS.length}`,
    `# Total files: ${FILE_MAPPINGS.length}`,
    `# Generated:   ${now}`,
    '# ══════════════════════════════════════════════════════════════════════════════',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(INDEX_OUT), { recursive: true });
  fs.writeFileSync(INDEX_OUT, header + toYaml(index), 'utf8');

  console.log(`\n  ✓ SDF Index written: docs/sdf-index.yaml`);
  console.log(`    ${SDF_DOCS.length} docs · ${FILE_MAPPINGS.length} files · ${Object.keys(layers).length} layers`);
  console.log(`    Layers: ${Object.entries(layers).map(([k,v]) => `${k}(${v})`).join(' ')}`);
  const h = KNOWN_ISSUES.filter(i => i.severity === 'high').length;
  const m = KNOWN_ISSUES.filter(i => i.severity === 'medium').length;
  const l = KNOWN_ISSUES.filter(i => i.severity === 'low').length;
  console.log(`    Issues: ${h} high · ${m} medium · ${l} low\n`);
}

// Exports for testing
module.exports = { FILE_MAPPINGS, SDF_DOCS, DOC_META, KNOWN_ISSUES, REPO_ROOT, SDF_ROOT };

if (require.main === module) {
  generate();
}
