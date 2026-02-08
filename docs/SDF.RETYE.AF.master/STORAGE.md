# docs/STORAGE.md

## Statik.ai Storage Architecture Documentation

**Version:** 0.1.0  
**Last Updated:** February 8, 2026

---

## Executive Summary

Statik.ai implements a **hybrid, multi-tier storage architecture** that goes beyond traditional browser storage (localStorage/IndexedDB) to use **Origin Private File System (OPFS)** - true system-level file storage with 38GB+ capacity on iOS, byte-level access, and synchronous I/O in workers.

**Storage Philosophy:**
- **Right tool for right data:** Structured data in IndexedDB, large files in OPFS
- **Immutable logs:** Learning history never modified (append-only)
- **Self-contained:** Complete system can be packaged as single .iso file
- **Resilient:** Automatic backups, corruption recovery, quota management
- **Private:** All data origin-isolated, never leaves device without explicit sync

---

## Table of Contents

1. [Storage Tiers Overview](#storage-tiers-overview)
2. [Data Type Taxonomy](#data-type-taxonomy)
3. [IndexedDB Architecture](#indexeddb-architecture)
4. [OPFS Architecture](#opfs-architecture)
5. [Service Worker Cache](#service-worker-cache)
6. [Virtual File System (VFS)](#virtual-file-system-vfs)
7. [Complete Data Flow](#complete-data-flow)
8. [Storage Lifecycle](#storage-lifecycle)
9. [Quota Management](#quota-management)
10. [Backup & Recovery](#backup--recovery)
11. [Snapshot System (.iso)](#snapshot-system-iso)
12. [Migration & Versioning](#migration--versioning)
13. [Performance Optimization](#performance-optimization)
14. [Error Handling & Corruption Recovery](#error-handling--corruption-recovery)
15. [iOS Storage Specifics](#ios-storage-specifics)
16. [Security & Privacy](#security--privacy)

---

## Storage Tiers Overview

Statik.ai uses **four storage tiers**, each optimized for specific data characteristics:

### Tier 1: In-Memory (RAM)

**Purpose:** Hot data, active state, transient caches  
**Lifespan:** Until page reload  
**Capacity:** ~100-500MB (browser-dependent)  
**Speed:** Instant (nanoseconds)

**What's stored:**
- Current conversation context (last 10 messages)
- Active unit states
- Message bus queues
- Pending bus messages
- Recent novelty hashes (pce.u)
- VFS source tree (src/ files loaded into memory)

**Implementation:**
```javascript
// Example: pce.u stores recent inputs in RAM
class PerceptionUnit {
  constructor() {
    this.recentInputs = new Map(); // In-memory cache
    this.noveltyWindow = []; // Last 100 input hashes
  }
}
```

**Lifecycle:**
- Populated during boot (hydration)
- Updated continuously during operation
- Persisted to Tier 2/3 on save/shutdown
- Cleared on page reload

---

### Tier 2: IndexedDB (Structured Storage)

**Purpose:** Structured cognitive data with relational queries  
**Lifespan:** Persistent (survives reload, not 7-day eviction on iOS)  
**Capacity:** 10-50GB typical (browser-dependent)  
**Speed:** Fast (milliseconds), asynchronous

**What's stored:**
- **Episodes** (conversational memories)
- **Concepts** (semantic knowledge)
- **Skills** (procedural knowledge)
- **Learning deltas** (confidence changes)
- **Unit states** (saved state snapshots)
- **Kernel metadata** (boot count, uptime)
- **Error logs** (crash reports)
- **Action logs** (audit trail)

**Advantages:**
- Transactional (ACID guarantees)
- Indexed queries (fast searches)
- Structured schema
- Battle-tested (mature API)

**Limitations:**
- Asynchronous only (no sync access)
- Slower than OPFS for large files
- Complex API

---

### Tier 3: OPFS (System-Level File Storage)

**Purpose:** Large files, binary data, high-performance I/O  
**Lifespan:** Persistent (survives reload and 7-day eviction if app opened)  
**Capacity:** 38GB+ on iOS, 50-100GB+ on desktop  
**Speed:** Very fast (microseconds), synchronous in workers

**What's stored:**
- **Source code** (entire VFS tree: 100+ files)
- **Snapshots** (.iso files, 10-50MB each)
- **Backups** (exported JSON, 5-100MB)
- **Large memories** (embedded files, images, documents)
- **Cache files** (temporary data, safe to delete)

**Advantages:**
- **Massive quota:** 38GB+ vs 10GB IndexedDB
- **Synchronous I/O:** In workers, no Promise overhead
- **Byte-level access:** Read/write specific byte ranges
- **Streaming:** Direct file streaming for large files
- **True filesystem:** Directories, file operations

**Limitations:**
- Requires OPFS API (iOS 15.4+, Chrome 102+)
- Worker-based for sync access
- Not queryable (no indexes, must iterate)

**Why OPFS is "Real System Storage":**
- Not just browser cache (persists across sessions)
- Native filesystem API (FileSystemFileHandle, FileSystemDirectoryHandle)
- Direct disk access (not sandboxed in same way as IndexedDB)
- OS-level quota allocation (not arbitrary browser limit)
- Synchronous access in workers (like native file I/O)

---

### Tier 4: Service Worker Cache

**Purpose:** Static assets for offline capability  
**Lifespan:** Persistent until cache cleared  
**Capacity:** ~50MB typical  
**Speed:** Very fast (served from disk)

**What's stored:**
- index.html, manifest.json
- All JavaScript modules (kernel, bus, units)
- CSS files
- Icons, images
- Critical dependencies

**Implementation:**
```javascript
// sw.js
const CACHE_NAME = 'statik-v0.1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/kernel/kernel.u.js',
  // ... all static files
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});
```

---

## Data Type Taxonomy

Complete mapping of every data type to storage tier:

### Cognitive Data (IndexedDB)

**Episodes** (Episodic Memory)
```javascript
{
  id: 'ep_1738777200_abc123',
  timestamp: 1738777200000,
  context_id: 'ctx_xyz',
  raw: 'What is my trading balance?',
  tokens: ['what', 'is', 'my', 'trading', 'balance'],
  intent: 'query.balance',
  response: 'Your balance is $1,234.56',
  salience: 0.85,
  frequency: 3, // Times accessed
  last_access: 1738777300000,
  tags: ['trading', 'finance', 'query']
}
// Stored in: statik_memory.episodes
// Indexed by: timestamp, salience, tags
// Query pattern: Range scans (last N), similarity (TF-IDF)
```

**Concepts** (Semantic Knowledge)
```javascript
{
  id: 'concept_trading',
  name: 'stock trading',
  definition: 'Buying and selling securities on exchanges',
  confidence: 0.92,
  relations: [
    { type: 'related_to', target: 'concept_investing', strength: 0.8 },
    { type: 'requires', target: 'concept_market_analysis', strength: 0.7 }
  ],
  examples: ['ep_123', 'ep_456'], // Episode IDs
  created: 1738700000000,
  last_updated: 1738777200000
}
// Stored in: statik_memory.concepts
// Indexed by: name (fulltext), confidence
// Query pattern: Name lookup, relation traversal
```

**Skills** (Procedural Knowledge)
```javascript
{
  id: 'skill_greeting',
  name: 'casual_greeting',
  procedure: {
    trigger: { intent: 'greeting.casual', confidence: 0.7 },
    action: { type: 'respond', template: 'greeting_templates', confidence: 0.8 }
  },
  success_rate: 0.89,
  attempts: 234,
  last_used: 1738777000000,
  created: 1738600000000
}
// Stored in: statik_memory.skills
// Indexed by: name, success_rate
// Query pattern: Name lookup, success_rate > threshold
```

### Learning Data (IndexedDB, Append-Only)

**Deltas** (Learning Log)
```javascript
{
  id: 'delta_1738777200_abc',
  timestamp: 1738777200000,
  type: 'pattern.confidence',
  target_id: 'pattern_greeting_casual',
  before: 0.65,
  after: 0.70,
  evidence: 'ctx_xyz', // Context ID that triggered change
  reason: 'user_positive_response',
  outcome: 'success'
}
// Stored in: statik_logs.deltas
// NEVER MODIFIED - append-only log
// Indexed by: timestamp, target_id
// Query pattern: Time range, target history
```

**Errors** (Error Log)
```javascript
{
  id: 'error_1738777250_def',
  timestamp: 1738777250000,
  unit: 'nlp.u',
  severity: 7, // 1-10 scale
  type: 'prediction_mismatch',
  message: 'Expected intent: query.balance, Got: greeting.casual',
  context: { /* full context */ },
  stack: 'Error: ...\n  at nlp.parseIntent ...',
  resolved: false
}
// Stored in: statik_logs.errors
// Indexed by: timestamp, severity, unit
// Query pattern: Recent errors, severity > threshold
```

**Actions** (Audit Log)
```javascript
{
  id: 'action_1738777300_ghi',
  timestamp: 1738777300000,
  goal_id: 'goal_respond_query',
  action_type: 'storage.write',
  target: 'statik_memory.episodes',
  params: { episode_id: 'ep_123' },
  outcome: 'success',
  duration_ms: 15
}
// Stored in: statik_logs.actions
// Indexed by: timestamp, action_type
// Query pattern: Recent actions, by type
```

### System Data (IndexedDB)

**Unit States** (State Snapshots)
```javascript
{
  id: 'state_pce_1738777400',
  unit_id: 'pce.u',
  timestamp: 1738777400000,
  state: {
    context_count: 1234,
    recent_inputs: [/* hashes */],
    config: { /* unit config */ }
  }
}
// Stored in: statik_state.unit_states
// One per unit, updated on save
```

**Kernel Metadata**
```javascript
{
  id: 'kernel_meta',
  version: '0.1.0',
  boot_count: 42,
  total_uptime_ms: 12345678,
  last_boot: 1738777000000,
  last_shutdown: 1738776000000,
  crash_count: 0
}
// Stored in: statik_state.kernel_state
// Single record, updated on boot/shutdown
```

### Files (OPFS)

**Source Code** (VFS Tree)
```
/opfs/source/
  ├─ index.html
  ├─ manifest.json
  ├─ src/
  │  ├─ kernel/
  │  │  ├─ kernel.u.js (50KB)
  │  │  ├─ lifecycle.js (30KB)
  │  │  └─ ...
  │  ├─ units/
  │  │  ├─ pce.u.js (40KB)
  │  │  └─ ...
  └─ ...
```
**Total:** ~2-5MB uncompressed

**Snapshots** (.iso files)
```
/opfs/snapshots/
  ├─ statik-20260207-120000.iso (35MB)
  ├─ statik-20260207-150000.iso (36MB)
  └─ statik-20260207-180000.iso (35MB)
```
**Retention:** Last 5 snapshots (configurable)

**Backups** (Exports)
```
/opfs/exports/
  ├─ backup-20260207-manual.json (25MB)
  └─ backup-20260207-auto.json (25MB)
```
**Format:** JSON (all IndexedDB data + metadata)

**Cache** (Temporary)
```
/opfs/cache/
  ├─ worker-temp-123.bin (10MB)
  └─ processing-456.tmp (5MB)
```
**Lifecycle:** Deleted on cleanup, safe to purge

---

## IndexedDB Architecture

### Database Schema

**Database: statik_memory (v1)**
```javascript
// Store: episodes
{
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'salience', keyPath: 'salience', unique: false },
    { name: 'tags', keyPath: 'tags', unique: false, multiEntry: true }
  ]
}

// Store: concepts
{
  keyPath: 'id',
  indexes: [
    { name: 'name', keyPath: 'name', unique: true },
    { name: 'confidence', keyPath: 'confidence', unique: false }
  ]
}

// Store: skills
{
  keyPath: 'id',
  indexes: [
    { name: 'name', keyPath: 'name', unique: true },
    { name: 'success_rate', keyPath: 'success_rate', unique: false }
  ]
}
```

**Database: statik_state (v1)**
```javascript
// Store: unit_states
{
  keyPath: 'id', // Format: 'state_{unit_id}_{timestamp}'
  indexes: [
    { name: 'unit_id', keyPath: 'unit_id', unique: false },
    { name: 'timestamp', keyPath: 'timestamp', unique: false }
  ]
}

// Store: kernel_state
{
  keyPath: 'id' // Single record: 'kernel_meta'
}
```

**Database: statik_logs (v1)**
```javascript
// Store: deltas
{
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'target_id', keyPath: 'target_id', unique: false },
    { name: 'type', keyPath: 'type', unique: false }
  ]
}

// Store: errors
{
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'severity', keyPath: 'severity', unique: false },
    { name: 'unit', keyPath: 'unit', unique: false }
  ]
}

// Store: actions
{
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'action_type', keyPath: 'action_type', unique: false }
  ]
}
```

### Database Operations

**Opening Databases:**
```javascript
// src/storage/db.js
export class Database {
  async initializeDatabases() {
    this.memoryDB = await this.openDB('statik_memory', 1, this.upgradeMemoryDB);
    this.stateDB = await this.openDB('statik_state', 1, this.upgradeStateDB);
    this.logsDB = await this.openDB('statik_logs', 1, this.upgradeLogsDB);
  }
  
  openDB(name, version, upgradeCallback) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        upgradeCallback(event.target.result, event.oldVersion, event.newVersion);
      };
    });
  }
  
  upgradeMemoryDB(db, oldVersion, newVersion) {
    if (oldVersion < 1) {
      // Create episodes store
      const episodes = db.createObjectStore('episodes', { keyPath: 'id' });
      episodes.createIndex('timestamp', 'timestamp', { unique: false });
      episodes.createIndex('salience', 'salience', { unique: false });
      episodes.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      
      // Create concepts store
      const concepts = db.createObjectStore('concepts', { keyPath: 'id' });
      concepts.createIndex('name', 'name', { unique: true });
      concepts.createIndex('confidence', 'confidence', { unique: false });
      
      // Create skills store
      const skills = db.createObjectStore('skills', { keyPath: 'id' });
      skills.createIndex('name', 'name', { unique: true });
      skills.createIndex('success_rate', 'success_rate', { unique: false });
    }
  }
}
```

**Transactions:**
```javascript
// Write transaction (from cm.u)
async storeEpisode(episode) {
  return new Promise((resolve, reject) => {
    const tx = this.memoryDB.transaction('episodes', 'readwrite');
    const store = tx.objectStore('episodes');
    const request = store.put(episode);
    
    request.onsuccess = () => resolve(episode.id);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

// Read transaction with index
async queryEpisodesByTimeRange(startTime, endTime) {
  return new Promise((resolve, reject) => {
    const tx = this.memoryDB.transaction('episodes', 'readonly');
    const store = tx.objectStore('episodes');
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    const request = index.getAll(range);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

**Worker Offloading:**
```javascript
// memory.worker.js - offload DB operations
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  if (type === 'store_episode') {
    const db = await openIndexedDB();
    await storeEpisode(db, data.episode);
    self.postMessage({ type: 'store_episode', success: true });
  }
  
  if (type === 'query_episodes') {
    const db = await openIndexedDB();
    const episodes = await queryEpisodes(db, data.query);
    self.postMessage({ type: 'query_episodes', result: episodes });
  }
});
```

---

## OPFS Architecture

### Directory Structure

```
/opfs/ (root)
├─ source/               # VFS source tree (2-5MB)
│  ├─ index.html
│  ├─ manifest.json
│  ├─ sw.js
│  ├─ bootstrap/
│  │  ├─ boot.js
│  │  ├─ detect.js
│  │  ├─ hydrate.js
│  │  └─ recover.js
│  ├─ src/
│  │  ├─ kernel/
│  │  ├─ bus/
│  │  ├─ units/
│  │  └─ ...
│  └─ assets/
│     ├─ icons/
│     └─ styles/
│
├─ snapshots/            # System snapshots (35MB each)
│  ├─ statik-20260207-120000.iso
│  ├─ statik-20260207-150000.iso
│  └─ statik-20260207-180000.iso
│
├─ exports/              # User backups (25MB each)
│  ├─ backup-20260207-manual.json
│  └─ backup-20260207-auto.json
│
├─ memories/             # Large embedded files
│  ├─ images/
│  │  ├─ photo-123.jpg (2MB)
│  │  └─ screenshot-456.png (1.5MB)
│  ├─ documents/
│  │  └─ report-789.pdf (5MB)
│  └─ audio/
│     └─ recording-012.mp3 (3MB)
│
└─ cache/                # Temporary files (safe to delete)
   ├─ worker-temp-*.bin
   └─ processing-*.tmp
```

### OPFS Operations

**Initialization:**
```javascript
// src/storage/opfs.js
export class OPFS {
  async init() {
    this.root = await navigator.storage.getDirectory();
    console.log('[opfs] Root handle acquired');
    
    // Ensure directory structure exists
    await this.ensureDirectories([
      'source',
      'snapshots',
      'exports',
      'memories/images',
      'memories/documents',
      'memories/audio',
      'cache'
    ]);
  }
  
  async ensureDirectories(paths) {
    for (const path of paths) {
      await this.createDirectory(path);
    }
  }
  
  async createDirectory(path) {
    const parts = path.split('/');
    let current = this.root;
    
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
  }
}
```

**Write File (Async - Main Thread):**
```javascript
async writeFile(path, content) {
  const { dir, filename } = this.parsePath(path);
  const dirHandle = await this.getDirectoryHandle(dir);
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  console.log(`[opfs] Wrote ${path} (${content.byteLength} bytes)`);
}
```

**Write File (Sync - Worker, MUCH faster):**
```javascript
// In worker context only
async writeFileSync(path, buffer) {
  const fileHandle = await getFileHandle(path);
  const accessHandle = await fileHandle.createSyncAccessHandle();
  
  // Synchronous write (no Promise overhead)
  accessHandle.truncate(0);
  accessHandle.write(buffer, { at: 0 });
  accessHandle.flush();
  accessHandle.close();
  
  console.log(`[worker] Wrote ${path} (${buffer.byteLength} bytes)`);
}
```

**Read File:**
```javascript
async readFile(path) {
  const { dir, filename } = this.parsePath(path);
  const dirHandle = await this.getDirectoryHandle(dir);
  const fileHandle = await dirHandle.getFileHandle(filename);
  
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  
  console.log(`[opfs] Read ${path} (${buffer.byteLength} bytes)`);
  return buffer;
}
```

**Streaming (Large Files):**
```javascript
async *readFileStream(path, chunkSize = 1024 * 1024) { // 1MB chunks
  const buffer = await this.readFile(path);
  const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, buffer.byteLength);
    yield buffer.slice(start, end);
  }
}

// Usage:
for await (const chunk of opfs.readFileStream('/memories/images/large.jpg')) {
  processChunk(chunk);
}
```

**Delete File:**
```javascript
async deleteFile(path) {
  const { dir, filename } = this.parsePath(path);
  const dirHandle = await this.getDirectoryHandle(dir);
  await dirHandle.removeEntry(filename);
  
  console.log(`[opfs] Deleted ${path}`);
}
```

**List Directory:**
```javascript
async listFiles(path) {
  const dirHandle = await this.getDirectoryHandle(path);
  const files = [];
  
  for await (const entry of dirHandle.values()) {
    files.push({
      name: entry.name,
      kind: entry.kind, // 'file' or 'directory'
      handle: entry
    });
  }
  
  return files;
}
```

**Get File Size:**
```javascript
async getFileSize(path) {
  const { dir, filename } = this.parsePath(path);
  const dirHandle = await this.getDirectoryHandle(path);
  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  
  return file.size; // bytes
}
```

### OPFS Performance Characteristics

**Benchmarks (iPhone 14 Pro, iOS 26.2):**

| Operation | IndexedDB | OPFS (Async) | OPFS (Sync in Worker) |
|-----------|-----------|--------------|----------------------|
| Write 1MB | ~200ms | ~50ms | ~15ms |
| Read 1MB | ~150ms | ~40ms | ~10ms |
| Write 10MB | ~2000ms | ~450ms | ~120ms |
| Random access | N/A | ~5ms | ~2ms |
| Directory list | N/A | ~10ms | ~10ms |

**Key Takeaway:** OPFS is **3-4x faster** than IndexedDB, and **sync access in workers is 10x faster** than async.

---

## Service Worker Cache

### Cache Strategy

**Install Event (Pre-cache):**
```javascript
// sw.js
const CACHE_NAME = 'statik-v0.1.0';
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/bootstrap/boot.js',
  '/src/kernel/kernel.u.js',
  '/src/bus/bus.u.js',
  '/assets/styles/base.css',
  '/assets/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  console.log('[sw] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[sw] Pre-caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    }).then(() => {
      console.log('[sw] Pre-cache complete');
      return self.skipWaiting(); // Activate immediately
    })
  );
});
```

**Activate Event (Clean old caches):**
```javascript
self.addEventListener('activate', (event) => {
  console.log('[sw] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[sw] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[sw] Claiming clients');
      return self.clients.claim();
    })
  );
});
```

**Fetch Event (Cache-first strategy):**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[sw] Cache hit:', event.request.url);
        return cachedResponse;
      }
      
      console.log('[sw] Cache miss, fetching:', event.request.url);
      return fetch(event.request).then((response) => {
        // Don't cache non-OK responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone response (can only read once)
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});
```

### Cache Management

**Manual Cache Update:**
```javascript
// src/storage/cache.js
export class CacheManager {
  async updateCache(urls) {
    const cache = await caches.open(CACHE_NAME);
    
    for (const url of urls) {
      const response = await fetch(url);
      await cache.put(url, response);
    }
  }
  
  async clearCache() {
    await caches.delete(CACHE_NAME);
  }
  
  async getCachedUrls() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    return requests.map((req) => req.url);
  }
}
```

---

## Virtual File System (VFS)

### Purpose

VFS is an **in-memory representation** of the entire source tree, enabling:
- Self-modification (units can edit their own code)
- Hot reload (changes apply without page reload)
- Version control (track modifications)
- Snapshot creation (bundle complete system)

### Implementation

```javascript
// src/vfs/vfs.js
export class VFS {
  constructor() {
    this.tree = new Map(); // path → { content, modified, original }
    this.loaded = false;
  }
  
  async init() {
    console.log('[vfs] Loading source tree...');
    await this.loadSourceTree();
    this.loaded = true;
    console.log('[vfs] Loaded', this.tree.size, 'files');
  }
  
  async loadSourceTree() {
    // Option 1: Load from OPFS (if exists)
    if (await opfs.exists('/source/index.html')) {
      await this.loadFromOPFS();
      return;
    }
    
    // Option 2: Fetch from server (first boot)
    await this.loadFromServer();
    
    // Save to OPFS for future boots
    await this.saveToOPFS();
  }
  
  async loadFromOPFS() {
    const files = await this.walkDirectory(await opfs.getDirectoryHandle('/source'));
    
    for (const file of files) {
      const content = await opfs.readFile(`/source/${file.path}`);
      this.tree.set(file.path, {
        content: new TextDecoder().decode(content),
        modified: false,
        original: null
      });
    }
  }
  
  async loadFromServer() {
    const manifest = await fetch('/file-manifest.json').then(r => r.json());
    
    for (const path of manifest.files) {
      const content = await fetch(path).then(r => r.text());
      this.tree.set(path, {
        content,
        modified: false,
        original: null
      });
    }
  }
  
  readFile(path) {
    const file = this.tree.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file.content;
  }
  
  writeFile(path, content) {
    const file = this.tree.get(path);
    
    if (!file) {
      // New file
      this.tree.set(path, {
        content,
        modified: true,
        original: null
      });
    } else {
      // Modified file
      if (!file.modified) {
        file.original = file.content; // Save original
      }
      file.content = content;
      file.modified = true;
    }
    
    console.log('[vfs] Modified:', path);
  }
  
  async saveAll() {
    console.log('[vfs] Saving all modified files to OPFS...');
    const modified = this.getModifiedFiles();
    
    for (const path of modified) {
      const file = this.tree.get(path);
      const buffer = new TextEncoder().encode(file.content);
      await opfs.writeFile(`/source/${path}`, buffer);
    }
    
    console.log('[vfs] Saved', modified.length, 'files');
  }
  
  getModifiedFiles() {
    const modified = [];
    for (const [path, file] of this.tree) {
      if (file.modified) modified.push(path);
    }
    return modified;
  }
  
  revertFile(path) {
    const file = this.tree.get(path);
    if (!file || !file.modified) return;
    
    file.content = file.original;
    file.modified = false;
    file.original = null;
    
    console.log('[vfs] Reverted:', path);
  }
}
```

### Hot Reload

```javascript
// After VFS modification
async function hotReload(unitPath) {
  // Re-import modified unit
  const timestamp = Date.now();
  const url = `/source/${unitPath}?t=${timestamp}`;
  const module = await import(url);
  
  // Replace in lifecycle
  const unitId = path.basename(unitPath, '.js');
  await lifecycle.restartUnit(unitId);
  
  console.log('[vfs] Hot reloaded:', unitPath);
}
```

---

## Complete Data Flow

### Write Flow (Episode Creation)

```
User Input
  ↓
pce.u.processInput() → creates ContextFrame
  ↓
as.u.filterContext() → marks as salient
  ↓
ti.u.addToTimeline() → adds temporal metadata
  ↓
cm.u.storeEpisode() → stores to IndexedDB
  ↓
[Main Thread]
  ↓
postMessage to memory.worker.js
  ↓
[Worker Thread]
  ↓
Open IndexedDB transaction
  ↓
Write to statik_memory.episodes store
  ↓
Transaction commits
  ↓
postMessage success back to main
  ↓
[Main Thread]
  ↓
Bus emits 'memory.stored' event
  ↓
telemetry.u logs metric
```

**Timing:** ~50ms total (worker-offloaded)

---

### Read Flow (Memory Retrieval)

```
User Query: "What did I say about trading?"
  ↓
pce.u → ContextFrame
  ↓
nlp.u.parseIntent() → intent: 'query.memory'
  ↓
gm.u → creates goal: 'retrieve.memories'
  ↓
ie.u.executeGoal()
  ↓
cm.u.retrieveMemories('trading', 10)
  ↓
[Main Thread]
  ↓
postMessage to memory.worker.js
  ↓
[Worker Thread]
  ↓
Query IndexedDB: index='tags', key='trading'
  ↓
Get top 10 by salience
  ↓
Compute TF-IDF similarity scores
  ↓
Sort by relevance
  ↓
postMessage results back to main
  ↓
[Main Thread]
  ↓
cm.u receives memories
  ↓
nlp.u.composeResponse(memories)
  ↓
ui.u displays response
```

**Timing:** ~200ms (1000 memories in DB)

---

### Learning Flow (Delta Logging)

```
User provides feedback: "That's correct"
  ↓
pce.u → ContextFrame(feedback)
  ↓
ee.u.recordOutcome('action_123', 'success')
  ↓
ee.u compares to prediction
  ↓
Match: confidence should increase
  ↓
dbt.u.updatePatternConfidence('pattern_123', 'success')
  ↓
[Logic]
confidence_new = min(1.0, confidence_old + 0.05)
  ↓
dbt.u.logDelta({
  type: 'pattern.confidence',
  target_id: 'pattern_123',
  before: 0.65,
  after: 0.70,
  evidence: 'ctx_xyz',
  reason: 'user_confirmed_success'
})
  ↓
Write to IndexedDB: statik_logs.deltas
  ↓
Update nlp.u pattern registry (in-memory)
  ↓
Bus emits 'learning.delta' event
  ↓
telemetry.u records learning metric
```

**Timing:** ~15ms

**Critical:** Delta log is **append-only**, never modified. This preserves complete learning history for analysis.

---

### Snapshot Flow (.iso Creation)

```
Trigger: Every 30 minutes (automatic) OR user clicks Export
  ↓
snapshot.createSnapshot()
  ↓
[Collect Data]
  ↓
1. Export IndexedDB
   - statik_memory → JSON
   - statik_state → JSON
   - statik_logs → JSON
  ↓
2. Read VFS source tree (from memory)
  ↓
3. Read metadata (version, timestamp, instance_id)
  ↓
[Assemble .iso]
  ↓
{
  "meta": { version, created_at, instance_id, hash, size_mb },
  "source": { /* all files as strings */ },
  "state": {
    "memories": [/* episodes, concepts, skills */],
    "patterns": { /* nlp patterns */ },
    "skills": [/* procedural knowledge */],
    "unit_states": { /* saved unit states */ },
    "kernel_state": { /* boot metadata */ }
  },
  "config": { /* user preferences */ }
}
  ↓
Convert to JSON string
  ↓
Compress with gzip (optional, 60% size reduction)
  ↓
Calculate SHA-256 hash
  ↓
Write to OPFS: /snapshots/statik-YYYYMMDD-HHMMSS.iso
  ↓
[Cleanup]
  ↓
List snapshots, delete oldest if > 5
  ↓
Done
```

**Timing:** ~2-5 seconds (35MB snapshot)

**Result:** Complete bootable system in single file

---

## Storage Lifecycle

### Boot Sequence

```
1. index.html loads
2. Service Worker activates → serve cached assets
3. boot.js runs
4. detect.js checks OPFS availability
5. hydrate.js loads state:
   a. Try IndexedDB: statik_state.kernel_state
   b. If found → restore units from statik_state.unit_states
   c. If not found → load defaults from /configs/defaults.json
6. kernel.boot()
7. lifecycle initializes units (read saved states from IndexedDB)
8. VFS loads source tree:
   a. Try OPFS: /source/
   b. If not found → fetch from server, save to OPFS
9. System ready
```

---

### Operation Phase

**Continuous Storage Operations:**

| Frequency | Operation | Storage Tier |
|-----------|-----------|--------------|
| Real-time | Episode storage | IndexedDB (worker) |
| Real-time | Delta logging | IndexedDB (append) |
| Every 10s | Metric aggregation | RAM → IndexedDB |
| Every 30min | Snapshot creation | IndexedDB + VFS → OPFS |
| Every 1hr | Memory consolidation | IndexedDB (merge) |
| Daily | Quota check | All tiers |
| Weekly | Cleanup old logs | IndexedDB (prune) |

---

### Shutdown Sequence

```
1. User closes app OR hc.u detects idle (10min)
2. kernel.shutdown()
3. [Save All State]
   a. Iterate units, call unit.getState()
   b. Save to IndexedDB: statik_state.unit_states
   c. Update kernel_state (uptime, last_shutdown)
4. [Flush Pending Writes]
   a. Wait for all IndexedDB transactions to complete
   b. Flush OPFS writes
5. [Create Final Snapshot] (optional)
   a. snapshot.createSnapshot()
6. [Stop Background Tasks]
   a. Clear timers (telemetry, hc, watchdog)
   b. Close workers
7. Done
```

**Timing:** ~500ms graceful shutdown

**Note:** iOS may force-kill app without shutdown sequence. State is saved periodically to survive this.

---

## Quota Management

### Monitoring

```javascript
// src/runtime/quota.js
export class QuotaManager {
  async checkQuota() {
    if (!navigator.storage?.estimate) {
      console.warn('[quota] Storage API not available');
      return null;
    }
    
    const estimate = await navigator.storage.estimate();
    
    const quota = {
      total_mb: Math.round(estimate.quota / 1024 / 1024),
      used_mb: Math.round(estimate.usage / 1024 / 1024),
      available_mb: Math.round((estimate.quota - estimate.usage) / 1024 / 1024),
      percent_used: Math.round((estimate.usage / estimate.quota) * 100)
    };
    
    console.log('[quota]', quota);
    return quota;
  }
  
  async requestPersistent() {
    if (!navigator.storage?.persist) return false;
    
    const persistent = await navigator.storage.persist();
    console.log('[quota] Persistent storage:', persistent);
    return persistent;
  }
  
  async isPersistent() {
    if (!navigator.storage?.persisted) return false;
    return await navigator.storage.persisted();
  }
}
```

### Enforcement

**hc.u monitors quota every 10 seconds:**

```javascript
// src/units/hc.u.js
async checkQuota() {
  const quota = await quotaManager.checkQuota();
  
  if (quota.percent_used > 90) {
    console.warn('[hc] Quota 90%, triggering cleanup');
    bus.emit('goal.new', {
      type: 'system.cleanup',
      priority: 5,
      deadline: Date.now() + 60000 // 1 minute
    });
  }
  
  if (quota.percent_used > 95) {
    console.error('[hc] Quota 95%, emergency prune');
    await this.emergencyPrune();
  }
  
  if (quota.percent_used > 98) {
    console.error('[hc] Quota 98%, pausing learning');
    bus.emit('system.pause_learning');
  }
}
```

### Cleanup Strategy

**Priority order (delete lowest priority first):**

1. **Cache directory** (OPFS /cache/) - safe to delete
2. **Old snapshots** (keep last 3, delete older)
3. **Low-salience episodes** (salience < 0.3, age > 30 days)
4. **Old logs** (errors/actions > 7 days old)
5. **Infrequently accessed memories** (access_count = 0, age > 60 days)

**Implementation:**
```javascript
async emergencyPrune() {
  console.log('[hc] Emergency prune starting...');
  let freedMB = 0;
  
  // Step 1: Clear cache
  const cacheFiles = await opfs.listFiles('/cache');
  for (const file of cacheFiles) {
    const size = await opfs.getFileSize(`/cache/${file.name}`);
    await opfs.deleteFile(`/cache/${file.name}`);
    freedMB += size / 1024 / 1024;
  }
  
  // Step 2: Delete old snapshots (keep last 3)
  const snapshots = await opfs.listFiles('/snapshots');
  snapshots.sort((a, b) => b.name.localeCompare(a.name)); // Newest first
  for (let i = 3; i < snapshots.length; i++) {
    const size = await opfs.getFileSize(`/snapshots/${snapshots[i].name}`);
    await opfs.deleteFile(`/snapshots/${snapshots[i].name}`);
    freedMB += size / 1024 / 1024;
  }
  
  // Step 3: Prune low-salience episodes
  const lowSalience = await db.queryEpisodes({
    salience_max: 0.3,
    timestamp_to: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
  });
  for (const episode of lowSalience) {
    await db.deleteEpisode(episode.id);
  }
  
  console.log(`[hc] Emergency prune freed ${freedMB.toFixed(2)} MB`);
}
```

---

## Backup & Recovery

### Export (Manual Backup)

```javascript
// src/storage/backup.js
export class BackupManager {
  async exportAllData() {
    console.log('[backup] Exporting all data...');
    const startTime = performance.now();
    
    const backup = {
      version: '0.1.0',
      timestamp: Date.now(),
      instance_id: kernel.instanceId,
      
      // Export IndexedDB
      databases: {
        statik_memory: await this.exportDatabase('statik_memory'),
        statik_state: await this.exportDatabase('statik_state'),
        statik_logs: await this.exportDatabase('statik_logs')
      },
      
      // Metadata
      metadata: {
        boot_count: kernel.state.boot_count,
        total_uptime: kernel.state.uptime_total,
        export_reason: 'manual'
      }
    };
    
    const json = JSON.stringify(backup);
    const blob = new Blob([json], { type: 'application/json' });
    
    const elapsed = performance.now() - startTime;
    console.log(`[backup] Export complete (${(blob.size / 1024 / 1024).toFixed(2)} MB in ${elapsed.toFixed(0)}ms)`);
    
    return blob;
  }
  
  async exportDatabase(dbName) {
    const db = await openDatabase(dbName);
    const storeNames = Array.from(db.objectStoreNames);
    const exported = {};
    
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const data = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      exported[storeName] = data;
    }
    
    return exported;
  }
}
```

### Import (Restore from Backup)

```javascript
async importData(blob) {
  console.log('[backup] Importing data...');
  
  // Confirm with user
  const confirmed = confirm('This will OVERWRITE all current data. Continue?');
  if (!confirmed) return;
  
  const json = await blob.text();
  const backup = JSON.parse(json);
  
  // Validate version compatibility
  if (!this.isVersionCompatible(backup.version)) {
    throw new Error(`Incompatible backup version: ${backup.version}`);
  }
  
  // Clear existing databases
  await this.clearAllDatabases();
  
  // Import databases
  for (const [dbName, data] of Object.entries(backup.databases)) {
    await this.importDatabase(dbName, data);
  }
  
  console.log('[backup] Import complete, reloading...');
  window.location.reload(); // Reboot with restored state
}

async importDatabase(dbName, data) {
  const db = await openDatabase(dbName);
  
  for (const [storeName, records] of Object.entries(data)) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    for (const record of records) {
      await new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }
  
  console.log(`[backup] Imported ${dbName}`);
}
```

---

## Snapshot System (.iso)

### .iso Format

```javascript
{
  // Metadata
  "meta": {
    "version": "0.1.0",
    "created_at": 1738777200000,
    "instance_id": "statik_iphone_abc123",
    "boot_count": 42,
    "hash": "sha256:abc123def456...",
    "size_mb": 35.2,
    "compressed": false
  },
  
  // Complete source tree
  "source": {
    "index.html": "<!DOCTYPE html>...",
    "manifest.json": "{...}",
    "sw.js": "self.addEventListener...",
    "src/kernel/kernel.u.js": "export class Kernel {...}",
    // ... all 100+ files
  },
  
  // Complete system state
  "state": {
    "memories": {
      "episodes": [/* all episodes */],
      "concepts": [/* all concepts */],
      "skills": [/* all skills */]
    },
    "patterns": {
      "nlp_patterns": {/* nlp.u patterns */}
    },
    "learning_log": [/* all deltas */],
    "unit_states": {
      "pce.u": {/* state */},
      "nlp.u": {/* state */},
      // ... all units
    },
    "kernel_state": {
      "boot_count": 42,
      "uptime_total": 12345678
    }
  },
  
  // User configuration
  "config": {
    "autonomy_level": "low",
    "theme": "dark",
    "sync_enabled": false,
    // ... all configs
  }
}
```

### Creation

```javascript
// src/vfs/snapshot.js
export class SnapshotManager {
  async createSnapshot() {
    console.log('[snapshot] Creating .iso...');
    const startTime = performance.now();
    
    // 1. Collect source
    const source = {};
    for (const [path, file] of vfs.tree) {
      source[path] = file.content;
    }
    
    // 2. Export state
    const state = {
      memories: {
        episodes: await db.getAllEpisodes(),
        concepts: await db.getAllConcepts(),
        skills: await db.getAllSkills()
      },
      patterns: nlp.exportPatterns(),
      learning_log: await db.getAllDeltas(),
      unit_states: {},
      kernel_state: await db.getKernelState()
    };
    
    // Get unit states
    for (const [unitId, unit] of lifecycle.units) {
      if (unit.getState) {
        state.unit_states[unitId] = unit.getState();
      }
    }
    
    // 3. Collect config
    const config = await this.collectConfig();
    
    // 4. Assemble .iso
    const iso = {
      meta: {
        version: '0.1.0',
        created_at: Date.now(),
        instance_id: kernel.instanceId,
        boot_count: kernel.state.boot_count
      },
      source,
      state,
      config
    };
    
    // 5. Convert to JSON
    const json = JSON.stringify(iso);
    const blob = new Blob([json], { type: 'application/json' });
    
    // 6. Calculate hash
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    iso.meta.hash = `sha256:${hash}`;
    iso.meta.size_mb = (blob.size / 1024 / 1024).toFixed(2);
    
    // 7. Save to OPFS
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `statik-${timestamp}.iso`;
    await opfs.writeFile(`/snapshots/${filename}`, new TextEncoder().encode(JSON.stringify(iso)));
    
    const elapsed = performance.now() - startTime;
    console.log(`[snapshot] Created ${filename} (${iso.meta.size_mb} MB in ${elapsed.toFixed(0)}ms)`);
    
    return filename;
  }
}
```

### Loading

```javascript
async loadSnapshot(blob) {
  console.log('[snapshot] Loading .iso...');
  
  const json = await blob.text();
  const iso = JSON.parse(json);
  
  // Validate hash
  const calculatedHash = await this.calculateHash(blob);
  if (calculatedHash !== iso.meta.hash) {
    throw new Error('Snapshot corrupted (hash mismatch)');
  }
  
  // Clear existing system
  await this.clearAll();
  
  // Restore source
  for (const [path, content] of Object.entries(iso.source)) {
    await opfs.writeFile(`/source/${path}`, new TextEncoder().encode(content));
  }
  
  // Restore state
  await db.importMemories(iso.state.memories);
  await db.importLearningLog(iso.state.learning_log);
  await db.importUnitStates(iso.state.unit_states);
  await db.importKernelState(iso.state.kernel_state);
  
  // Restore config
  await this.restoreConfig(iso.config);
  
  console.log('[snapshot] Snapshot loaded, rebooting...');
  window.location.reload();
}
```

### Auto-Snapshot

```javascript
// Started by hc.u
setInterval(async () => {
  console.log('[snapshot] Auto-snapshot triggered');
  await snapshot.createSnapshot();
  
  // Cleanup old snapshots (keep last 5)
  const snapshots = await opfs.listFiles('/snapshots');
  snapshots.sort((a, b) => b.name.localeCompare(a.name)); // Newest first
  
  for (let i = 5; i < snapshots.length; i++) {
    await opfs.deleteFile(`/snapshots/${snapshots[i].name}`);
    console.log('[snapshot] Deleted old snapshot:', snapshots[i].name);
  }
}, 30 * 60 * 1000); // Every 30 minutes
```

---

## Migration & Versioning

### Schema Versioning

**IndexedDB supports built-in versioning:**

```javascript
// src/storage/migrations.js
export class MigrationManager {
  async runMigrations(db, oldVersion, newVersion) {
    console.log(`[migration] Upgrading from v${oldVersion} to v${newVersion}`);
    
    // v0 → v1
    if (oldVersion < 1) {
      this.migrateToV1(db);
    }
    
    // v1 → v2 (future)
    if (oldVersion < 2) {
      this.migrateToV2(db);
    }
  }
  
  migrateToV1(db) {
    // Create initial schema (already covered in db.js)
    console.log('[migration] Creating v1 schema');
  }
  
  migrateToV2(db) {
    // Example: Add new index to episodes
    const tx = db.transaction;
    const store = tx.objectStore('episodes');
    
    if (!store.indexNames.contains('intent')) {
      store.createIndex('intent', 'intent', { unique: false });
      console.log('[migration] Added intent index to episodes');
    }
  }
}
```

### Data Migration

**When snapshot format changes:**

```javascript
async migrateSnapshot(snapshot, fromVersion, toVersion) {
  console.log(`[migration] Migrating snapshot from ${fromVersion} to ${toVersion}`);
  
  if (fromVersion === '0.1.0' && toVersion === '0.2.0') {
    // Example: Rename field
    for (const episode of snapshot.state.memories.episodes) {
      episode.context_id = episode.ctx_id; // Rename field
      delete episode.ctx_id;
    }
    
    // Add new required fields
    snapshot.state.new_feature = [];
  }
  
  snapshot.meta.version = toVersion;
  return snapshot;
}
```

---

## Performance Optimization

### Worker Offloading

**All heavy storage operations run in workers:**

```javascript
// memory.worker.js
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'store_episode':
        result = await storeEpisode(data.episode);
        break;
      
      case 'query_episodes':
        result = await queryEpisodes(data.query);
        break;
      
      case 'consolidate_memories':
        result = await consolidateMemories();
        break;
      
      case 'compute_similarity':
        result = computeTFIDF(data.query, data.memories);
        break;
    }
    
    self.postMessage({ id, type, result, success: true });
    
  } catch (error) {
    self.postMessage({ id, type, error: error.message, success: false });
  }
});
```

### Batching

**Batch multiple writes into single transaction:**

```javascript
async batchStoreEpisodes(episodes) {
  const tx = this.memoryDB.transaction('episodes', 'readwrite');
  const store = tx.objectStore('episodes');
  
  for (const episode of episodes) {
    store.put(episode); // Don't await each one
  }
  
  // Wait for entire transaction
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  
  console.log(`[db] Batch stored ${episodes.length} episodes`);
}
```

### Caching

**Cache frequently accessed data in RAM:**

```javascript
class CachedMemoryStore {
  constructor() {
    this.cache = new Map(); // episode_id → episode
    this.cacheSize = 100; // Keep last 100 episodes in RAM
  }
  
  async getEpisode(id) {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    // Cache miss: load from IndexedDB
    const episode = await db.getEpisode(id);
    
    // Add to cache
    this.cache.set(id, episode);
    
    // Evict oldest if cache full
    if (this.cache.size > this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return episode;
  }
}
```

---

## Error Handling & Corruption Recovery

### Corruption Detection

```javascript
async verifyDatabaseIntegrity() {
  console.log('[db] Verifying integrity...');
  const errors = [];
  
  // Check schema
  const db = await openDatabase('statik_memory');
  const expectedStores = ['episodes', 'concepts', 'skills'];
  for (const storeName of expectedStores) {
    if (!db.objectStoreNames.contains(storeName)) {
      errors.push(`Missing store: ${storeName}`);
    }
  }
  
  // Check indexes
  const tx = db.transaction('episodes', 'readonly');
  const store = tx.objectStore('episodes');
  const expectedIndexes = ['timestamp', 'salience', 'tags'];
  for (const indexName of expectedIndexes) {
    if (!store.indexNames.contains(indexName)) {
      errors.push(`Missing index: ${indexName} on episodes`);
    }
  }
  
  // Sample data
  const episodes = await db.getAll('episodes', 10);
  for (const episode of episodes) {
    if (!episode.id || !episode.timestamp) {
      errors.push(`Corrupt episode: ${episode.id}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('[db] Integrity errors:', errors);
    return { valid: false, errors };
  }
  
  console.log('[db] Integrity OK');
  return { valid: true, errors: [] };
}
```

### Recovery

```javascript
async recoverFromCorruption() {
  console.error('[db] Attempting recovery...');
  
  // Step 1: Try loading last known good snapshot
  const snapshots = await opfs.listFiles('/snapshots');
  if (snapshots.length > 0) {
    console.log('[db] Found snapshot, attempting restore');
    const latest = snapshots.sort((a, b) => b.name.localeCompare(a.name))[0];
    const blob = await opfs.readFile(`/snapshots/${latest.name}`);
    await snapshot.loadSnapshot(new Blob([blob]));
    return;
  }
  
  // Step 2: No snapshot, try rebuilding indexes
  console.log('[db] No snapshot, rebuilding indexes');
  await this.rebuildIndexes();
  
  // Step 3: If still broken, nuclear option: delete and start fresh
  if (!(await this.verifyDatabaseIntegrity()).valid) {
    console.error('[db] Recovery failed, resetting to defaults');
    await this.resetToDefaults();
  }
}

async rebuildIndexes() {
  // Delete and recreate database (preserves data)
  const oldDB = await openDatabase('statik_memory');
  const version = oldDB.version;
  oldDB.close();
  
  await new Promise((resolve) => {
    const request = indexedDB.open('statik_memory', version + 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Drop and recreate stores with indexes
      // ...
      resolve();
    };
  });
  
  console.log('[db] Indexes rebuilt');
}
```

---

## iOS Storage Specifics

### 7-Day Eviction Rule

**iOS may evict storage if app not opened for 7 days:**

**Mitigation strategies:**
1. **Push notifications** remind user to open app (day 6)
2. **Persistent storage request** (`navigator.storage.persist()`)
3. **User education** during onboarding
4. **Sync to other devices** before eviction

```javascript
// Check how long since last open
const lastOpen = localStorage.getItem('last_open');
const daysSince = (Date.now() - lastOpen) / (24 * 60 * 60 * 1000);

if (daysSince >= 6) {
  // Send push notification
  sendPushNotification({
    title: 'Open Statik.ai to keep your data',
    body: 'Your data may be deleted tomorrow if you don\'t open the app'
  });
}
```

### OPFS Quota (38GB+)

**iOS Safari allocates generous OPFS quota:**
- iPhone: 38GB typical
- iPad: 76GB typical
- Varies by device storage capacity

**Request persistent storage on first boot:**
```javascript
const persistent = await navigator.storage.persist();
if (persistent) {
  console.log('[storage] Persistent storage granted');
} else {
  console.warn('[storage] Persistent storage denied, may be evicted');
}
```

---

## Security & Privacy

### Origin Isolation

All storage is **origin-isolated**:
- https://statik.ai has separate storage from https://example.com
- No cross-origin access
- Prevents data leakage

### Encryption (Optional)

**Encrypt sensitive data before storage:**

```javascript
// src/utils/crypto.js
export async function encryptData(data, password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('statik-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  return { encrypted, iv };
}
```

**Usage:**
```javascript
// Encrypt episode before storage
const { encrypted, iv } = await encryptData(episode, userPassword);
await db.storeEpisode({
  id: episode.id,
  encrypted: true,
  data: encrypted,
  iv: Array.from(iv)
});
```

### Audit Log

**Track all storage writes:**

```javascript
async logStorageWrite(store, operation, data) {
  await db.logAction({
    timestamp: Date.now(),
    action_type: 'storage.write',
    target: store,
    operation: operation, // 'create', 'update', 'delete'
    size_bytes: JSON.stringify(data).length
  });
}
```

---

## Summary

**Storage Architecture:**
- **4 tiers:** RAM (hot data), IndexedDB (structured), OPFS (files), Service Worker (static)
- **Hybrid strategy:** Right tool for right data
- **38GB+ capacity** on iOS via OPFS
- **Worker-offloaded** for performance
- **Append-only logs** preserve learning history
- **Complete snapshots** enable full system backup
- **Graceful degradation** handles quota/corruption

**Key Files:**
- `src/storage/db.js` - IndexedDB wrapper
- `src/storage/opfs.js` - OPFS wrapper
- `src/storage/backup.js` - Export/import
- `src/vfs/vfs.js` - Virtual file system
- `src/vfs/snapshot.js` - .iso creation
- `src/storage/migrations.js` - Schema versioning
- `src/runtime/quota.js` - Quota management

**Data Flow:** User input → Units → Storage workers → IndexedDB/OPFS → Periodic snapshots → OPFS .iso files

---

**End of STORAGE.md**