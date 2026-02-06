Statik.ai – Complete Operating Blueprint
System Architecture Document v0.1

I. Directory Structure (Full System)
```txt
Statik.ai/
│
├─ index.html                    # Entry point, PWA shell
├─ manifest.json                 # PWA manifest (universal install)
├─ sw.js                         # Service Worker (offline, caching, lifecycle)
├─ README.md                     # User-facing docs
├─ ARCHITECTURE.md               # This document
│
├─ bootstrap/                    # Cold start & initialization
│  ├─ boot.js                   # Orchestrates first load
│  ├─ detect.js                 # Capability detection (iOS features, APIs)
│  ├─ hydrate.js                # Rehydrate from stored state
│  └─ recover.js                # Error recovery, safe mode
│
├─ configs/                      # System configuration
│  ├─ units.registry.json       # Unit manifest (dependencies, order)
│  ├─ capabilities.json         # Feature flags (WebGPU, OPFS, etc)
│  ├─ constraints.json          # Hard limits (memory, CPU, storage)
│  └─ defaults.json             # Default settings
│
├─ schemas/                      # Data structures & validation
│  ├─ messages/                 # Inter-unit message schemas
│  │  ├─ context.schema.json
│  │  ├─ intent.schema.json
│  │  ├─ memory.schema.json
│  │  └─ action.schema.json
│  ├─ storage/                  # Database schemas
│  │  ├─ episodes.schema.json
│  │  ├─ concepts.schema.json
│  │  └─ skills.schema.json
│  └─ state/                    # System state schemas
│     ├─ unit.state.schema.json
│     └─ kernel.state.schema.json
│
├─ src/
│  │
│  ├─ kernel/                   # Core orchestration
│  │  ├─ kernel.u.js           # Main coordinator
│  │  ├─ lifecycle.js          # Unit lifecycle management
│  │  ├─ registry.js           # Unit registration/lookup
│  │  └─ watchdog.js           # Crash detection/recovery
│  │
│  ├─ bus/                      # Message infrastructure
│  │  ├─ bus.u.js              # Core pub/sub
│  │  ├─ channels.js           # Priority lanes
│  │  ├─ router.js             # Message routing logic
│  │  └─ validator.js          # Schema validation
│  │
│  ├─ runtime/                  # Process & resource management
│  │  ├─ scheduler.js          # Task scheduling (priority, deadlines)
│  │  ├─ allocator.js          # Resource allocation (CPU%, memory)
│  │  ├─ quota.js              # Storage quota management
│  │  └─ throttle.js           # Rate limiting, backpressure
│  │
│  ├─ units/                    # Cognitive units
│  │  ├─ pce.u.js              # Perception & Context Encoder
│  │  ├─ as.u.js               # Attention & Salience
│  │  ├─ ti.u.js               # Temporal Integrator
│  │  ├─ gm.u.js               # Goals & Motivation
│  │  ├─ nlp.u.js              # Natural Language Processor
│  │  ├─ cm.u.js               # Core Memory
│  │  ├─ dbt.u.js              # Delta & Learning Ledger
│  │  ├─ ee.u.js               # Evaluation & Error
│  │  ├─ sa.u.js               # Self Model & Awareness
│  │  ├─ ie.u.js               # Intent Execution
│  │  ├─ ec.u.js               # Constraints & Ethics
│  │  ├─ hc.u.js               # Homeostasis
│  │  ├─ sync.u.js             # Sync & Federation
│  │  ├─ ui.u.js               # User Interface
│  │  ├─ telemetry.u.js        # Observability
│  │  └─ dev.u.js              # Developer Tools
│  │
│  ├─ workers/                  # Web Workers (isolation)
│  │  ├─ cognition.worker.js   # Compute-heavy processing
│  │  ├─ memory.worker.js      # Storage operations
│  │  ├─ nlp.worker.js         # Language processing
│  │  └─ compute.worker.js     # Math/crypto operations
│  │
│  ├─ adapters/                 # Platform-specific integration
│  │  ├─ ios/
│  │  │  ├─ hardware.adapter.js    # Camera, sensors, haptics
│  │  │  ├─ storage.adapter.js     # OPFS, quota, file handling
│  │  │  ├─ network.adapter.js     # Network detection, background
│  │  │  └─ permissions.adapter.js # Permission requests
│  │  ├─ web/
│  │  │  ├─ webgpu.adapter.js      # WebGPU compute
│  │  │  ├─ indexeddb.adapter.js   # Storage abstraction
│  │  │  └─ notifications.adapter.js
│  │  └─ universal/
│  │     ├─ crypto.adapter.js      # WebCrypto wrapper
│  │     └─ time.adapter.js        # Performance timing
│  │
│  ├─ storage/                  # Persistence layer
│  │  ├─ db.js                 # IndexedDB initialization
│  │  ├─ migrations.js         # Schema migrations
│  │  ├─ backup.js             # Export/import state
│  │  ├─ opfs.js               # Origin Private File System
│  │  └─ cache.js              # Service Worker cache control
│  │
│  ├─ vfs/                      # Virtual File System (self-hosting)
│  │  ├─ vfs.js                # File system abstraction
│  │  ├─ tree.js               # Directory tree management
│  │  ├─ editor.js             # Monaco editor integration
│  │  ├─ loader.js             # Dynamic module loading
│  │  └─ snapshot.js           # System state snapshots
│  │
│  ├─ protocols/                # Inter-unit communication
│  │  ├─ rpc.js                # Request/response protocol
│  │  ├─ stream.js             # Streaming data protocol
│  │  ├─ event.js              # Fire-and-forget events
│  │  └─ handshake.js          # Unit initialization protocol
│  │
│  ├─ ui/                       # User interface components
│  │  ├─ shell.js              # Main UI shell
│  │  ├─ chat.js               # Chat interface
│  │  ├─ inspector/            # System inspection tools
│  │  │  ├─ memory.inspector.js
│  │  │  ├─ goals.inspector.js
│  │  │  ├─ trace.inspector.js
│  │  │  └─ performance.inspector.js
│  │  ├─ editor/               # Code editor (Monaco)
│  │  │  ├─ monaco.loader.js
│  │  │  └─ file.browser.js
│  │  └─ controls/             # System controls
│  │     ├─ pause.js
│  │     ├─ reset.js
│  │     └─ export.js
│  │
│  └─ utils/                    # Shared utilities
│     ├─ id.js                 # UUID generation
│     ├─ time.js               # Timestamp utilities
│     ├─ math.js               # Vector ops, cosine similarity
│     ├─ hash.js               # Hashing for deduplication
│     ├─ validate.js           # Schema validation
│     ├─ logger.js             # Structured logging
│     └─ crypto.js             # Encryption helpers
│
├─ assets/                      # Static resources
│  ├─ icons/                   # PWA icons (multiple sizes)
│  ├─ styles/                  # CSS modules
│  │  ├─ base.css
│  │  ├─ chat.css
│  │  └─ inspector.css
│  └─ fonts/                   # Web fonts (optional)
│
├─ tests/                       # Testing infrastructure
│  ├─ unit/                    # Unit tests
│  ├─ integration/             # Integration tests
│  ├─ e2e/                     # End-to-end tests
│  └─ fixtures/                # Test data
│
├─ docs/                        # Documentation
│  ├─ API.md                   # Unit APIs
│  ├─ BOOT.md                  # Boot sequence
│  ├─ MESSAGES.md              # Message schemas
│  ├─ STORAGE.md               # Storage architecture
│  └─ IOS.md                   # iOS-specific features
│
├─ sfti.iso                     # System snapshot (self-bootstrap)
│  # This is a JSON bundle containing:
│  # - Full source tree
│  # - Initial state
│  # - Configuration
│  # - Allows system to reconstruct itself from scratch
│  # - As well as creates a `sfti.ipa` to be side loaded as an App through AltStore
│
└─ build/                       # Build artifacts (git-ignored)
   ├─ dist/                    # Production build
   └─ reports/                 # Test coverage, bundle size
```

---

# II. iOS 26.3 Developer Beta Integration
## A. Developer Tab Features to Leverage
### 1. File System Access (OPFS)
```browser
// src/adapters/ios/storage.adapter.js
// Origin Private File System - persistent storage beyond IndexedDB
```
#### Features:
- Write files directly from web (no download prompt)
- Full directory tree manipulation
- Larger storage quota (gigabytes vs megabytes)
- Syncs with iCloud (if user enables)

#### Usage in Statik.ai:
- Store large datasets (trading patterns, market data)
- Monaco editor file persistence
- VFS backing storage
- System snapshots (sfti.iso)

### 2. WebGPU Compute
```browser
// src/adapters/web/webgpu.adapter.js
// GPU acceleration for vector operations
```
#### Features:
- Parallel computation (similarity scoring, pattern matching)
- Shader-based processing
- Low-latency inference (custom lightweight models)

#### Usage in Statik.ai:
- cm.u: Fast memory similarity search
- nlp.u: Parallel tokenization
- dbt.u: Batch delta computations

### 3. Camera & Sensors
```browser
// src/adapters/ios/hardware.adapter.js
```
#### Available APIs:
- getUserMedia (camera/mic)
- DeviceMotionEvent (accelerometer, gyroscope)
- AmbientLightSensor (light level)
- Geolocation (position tracking)

#### Usage in Statik.ai:
- pce.u: Visual context (OCR for receipts, documents)
- Context from physical environment (motion patterns)
- Location-aware features (geofenced reminders)

### 4. Background Execution
```browser
// Service Worker + Background Fetch/Sync
```
#### Features:
- Process tasks when app in background
- Periodic sync (update data while offline)
- Background fetch (large downloads)

#### Usage in Statik.ai:
- Market data updates (even when app closed)
- Memory consolidation (during idle)
- Pattern learning (low-priority background tasks)

### 5. Storage Quota Management
```browser
// navigator.storage.estimate()
```
#### Features:
- Query available storage
- Request persistent storage (won't be evicted)
- Monitor usage

#### Usage in Statik.ai:
- hc.u: Prevent storage exhaustion
- Automatic pruning when quota low
- Warn user before critical limits

### 6. Haptic Feedback
```browser
// navigator.vibrate() + iOS haptic patterns
```
#### Features:
- Tactile feedback for interactions
- Success/error patterns

#### Usage in Statik.ai:
- Confirm user actions
- Alert for critical events (goal completion, errors)

## B. Manifest Configuration for iOS
```json
// manifest.json
{
  "name": "Statik.ai",
  "short_name": "Statik",
  "description": "Client-side autonomous cognitive runtime",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#000000",
  
  "icons": [
    {
      "src": "assets/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/icons/icon-180.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  
  "categories": ["productivity", "utilities", "finance"],
  
  "shortcuts": [
    {
      "name": "Quick Entry",
      "short_name": "Entry",
      "description": "Start new conversation",
      "url": "./?action=new",
      "icons": [{"src": "assets/icons/new.png", "sizes": "96x96"}]
    },
    {
      "name": "Memory",
      "short_name": "Memory",
      "description": "View stored memories",
      "url": "./?action=memory",
      "icons": [{"src": "assets/icons/memory.png", "sizes": "96x96"}]
    }
  ],
  
  "permissions": [
    "storage",
    "notifications",
    "geolocation",
    "camera",
    "microphone"
  ],
  
  "file_handlers": [
    {
      "action": "./import",
      "accept": {
        "application/json": [".json"],
        "text/csv": [".csv"]
      }
    }
  ],
  
  "share_target": {
    "action": "./share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "file",
          "accept": ["image/*", "application/pdf", "text/*"]
        }
      ]
    }
  }
}
```

---

# III. Critical System Components (Deep Dive)
## A. Boot Sequence
```browser
// bootstrap/boot.js
```

### BOOT PHASES:

#### 1. DETECT (bootstrap/detect.js)
   - Check environment (iOS? Desktop? Capabilities?)
   - Detect APIs (WebGPU? OPFS? Notifications?)
   - Measure quota (storage, memory limits)
   - Log capabilities to configs/capabilities.json
   
#### 2. INITIALIZE (src/kernel/kernel.u.js)
   - Load kernel
   - Initialize bus.u (message system)
   - Spawn workers (cognition, memory, nlp, compute)
   - Load unit registry (configs/units.registry.json)
   
#### 3. HYDRATE (bootstrap/hydrate.js)
   - Check for existing state (IndexedDB)
   - If found: Load saved state
   - If not: Initialize fresh state
   - Load configurations
   
#### 4. WAKE (src/kernel/lifecycle.js)
   - Initialize units in dependency order:
     pce → as → ti → cm → nlp → gm → ee → dbt → sa → ie → ec → hc → ui
   - Each unit reports "ready" via bus
   - Kernel waits for all units before "system.ready"
   
#### 5. READY (src/kernel/kernel.u.js)
   - Emit "system.ready" event
   - UI becomes interactive
   - Background tasks start (memory consolidation, etc)

### ERROR RECOVERY:
- If any phase fails: bootstrap/recover.js
- Enter safe mode (minimal UI, core units only)
- Allow user to reset or restore from backup

## B. Inter-Unit Communication Protocol
```browser
// protocols/rpc.js - Request/Response
// protocols/event.js - Fire-and-forget
// protocols/stream.js - Continuous data
```

### MESSAGE STRUCTURE:
```json
{
  id: "msg_1738777200_ab3f",        // Unique ID
  timestamp: 1738777200,            // Unix timestamp (ms)
  type: "request" | "response" | "event" | "stream",
  
  source: "unit.name",              // Sender
  target: "unit.name" | "broadcast",// Receiver
  
  channel: "default" | "high" | "low", // Priority lane
  
  payload: {
    method: "parse",                // For RPC
    params: {...},                  // Method parameters
    data: {...}                     // Or raw data for events
  },
  
  metadata: {
    timeout: 5000,                  // Max wait time (ms)
    retries: 3,                     // Retry count
    trace: true                     // Enable tracing
  }
}
```

### VALIDATION:
- All messages validated against schemas/messages/*.schema.json
- Invalid messages dropped (logged to telemetry.u)
- Schema violations trigger errors (ee.u)

## C. Storage Architecture
```browser
// storage/db.js - IndexedDB wrapper
```

---

### DATABASES:

#### 1. "statik_memory" (Core persistence)
   Object Stores:
   - episodes: {id, timestamp, context, salience, tags[]}
   - concepts: {id, name, definition, relations[], confidence}
   - skills: {id, name, procedure[], success_rate, last_used}
   
#### 2. "statik_state" (System state)
   Object Stores:
   - unit_states: {unit_id, state_data, last_updated}
   - kernel_state: {boot_count, uptime, crashes[], version}
   
#### 3. "statik_logs" (Append-only logs)
   Object Stores:
   - deltas: {timestamp, type, before, after, evidence}
   - errors: {timestamp, unit, error, context, stack}
   - actions: {timestamp, intent, action, outcome}

#### OPFS (Origin Private File System):
```txt
/
├─ snapshots/
│  ├─ 2026-02-06_12-00.snapshot.json
│  └─ latest.snapshot.json
├─ datasets/
│  ├─ trading_patterns.csv
│  └─ market_history.parquet
└─ monaco/
   ├─ src/
   └─ configs/
```

#### CACHE (Service Worker):
- Static assets (HTML, CSS, JS)
- Fonts, icons
- Monaco editor files

## D. Worker Architecture
```browser
// workers/cognition.worker.js
PURPOSE: Heavy computation without blocking main thread
```
### RESPONSIBILITIES:
- Pattern matching (cm.u queries)
- Similarity scoring (vector operations)
- Goal prioritization (gm.u)
- Intent classification (nlp.u)

### ISOLATION:
- No DOM access
- Message-only communication with main thread
- Independent error boundary
```browser
// workers/memory.worker.js
PURPOSE: Database operations
```
### RESPONSIBILITIES:
- IndexedDB queries (async, won't block UI)
- Memory pruning (hc.u triggers)
- Backup/restore operations
- OPFS file operations

```browser
// workers/nlp.worker.js
PURPOSE: Language processing pipeline
```
### RESPONSIBILITIES:
- Tokenization
- POS tagging
- Intent extraction
- Response composition

```browser
// workers/compute.worker.js
PURPOSE: Math/crypto operations
```
### RESPONSIBILITIES:
- Hash generation (deduplication)
- Encryption (if needed)
- Vector math (TF-IDF, cosine similarity)

## E. Virtual File System (VFS) for Self-Hosting
```browser
// vfs/vfs.js
```browser
##% PURPOSE:
System can edit its own source code via Monaco editor

### IMPLEMENTATION:
1. Load entire source tree into memory (vfs/tree.js)
2. Mount as virtual filesystem in browser
3. Monaco editor reads/writes to VFS
4. Changes saved to OPFS
5. Hot reload modified modules (vfs/loader.js)

### FILE TREE STRUCTURE:
VFS mirrors physical directory structure
- Read: Fetch from OPFS or fallback to network
- Write: Save to OPFS (persistent)
- Snapshot: vfs/snapshot.js creates sfti.iso

### MONACO INTEGRATION:
- Syntax highlighting
- IntelliSense (basic JS completion)
- File browser UI
- Diff viewer (compare saved vs modified)

### SELF-MODIFICATION SAFETY:
- All changes versioned (Git-like diff storage)
- Rollback capability (restore previous snapshot)
- Sandbox test mode (run modified code in iframe)
- User must explicitly apply changes

## F. sfti.iso Structure
```browser
// sfti.iso (Self-bootstrapping system image)
```
### FORMAT: 
- JSON (compressed with pako.js for smaller size)

###CONTENTS:
```json
{
  "meta": {
    "version": "0.1.0",
    "created": "2026-02-06T12:00:00Z",
    "hash": "sha256_of_contents"
  },
  
  "source": {
    // Complete source tree as nested object
    "index.html": "<html>...</html>",
    "manifest.json": "{...}",
    "src/kernel/kernel.u.js": "export class Kernel {...}",
    // ... all files
  },
  
  "state": {
    "memory": {
      // Exported IndexedDB data
      "episodes": [...],
      "concepts": [...],
      "skills": [...]
    },
    "units": {
      // Unit states at snapshot time
      "cm.u": {...},
      "gm.u": {...}
    }
  },
  
  "config": {
    // System configuration
    "capabilities": {...},
    "constraints": {...}
  }
}

// USAGE:
// 1. User exports sfti.iso from running system
// 2. Can host on any static server
// 3. Loading sfti.iso bootstraps entire system from scratch
// 4. Includes learned patterns, memories, configurations
```

---

## IV. Unit Responsibilities (Detailed)

```unit
pce.u - Perception & Context Encoder
```
### INPUTS:
- User text input (ui.u)
- DOM events (clicks, scrolls, focus changes)
- Network responses (fetch completion)
- Time events (scheduled ticks)
- Sensor data (iOS hardware.adapter.js)

### PROCESS:
1. Normalize input into ContextFrame
2. Extract features (tokens, n-grams, embeddings-lite)
3. Tag intent hints (query, command, statement)
4. Calculate novelty score (compare to recent contexts)
5. Assign urgency level (user-initiated = high)

### OUTPUT:
ContextFrame emitted to bus → as.u filters → ti.u timestamps

### FILES:
- units/pce.u.js (main logic)
- workers/nlp.worker.js (tokenization offloaded)

```unit
as.u - Attention & Salience
```
### INPUTS:
- ContextFrame stream from pce.u

### PROCESS:
1. Score each frame:
   - Novelty (haven't seen recently)
   - Urgency (user waiting?)
   - Goal alignment (helps current goal?)
   - Resource cost (processing budget)
2. Filter: Keep top N frames
3. Drop duplicates (hash-based deduplication)

### OUTPUT:
Salient ContextFrames → ti.u, cm.u, gm.u

### PREVENTS:
- Processing spam (repeated inputs)
- Runaway loops (attention exhaustion)
- Resource waste (low-value contexts)

```unit
ti.u - Temporal Integrator
```
### INPUTS:
- ContextFrames from as.u

### PROCESS:
1. Add timestamp, sequence number
2. Build causal chains (A→B→C)
3. Maintain sliding windows:
   - Last 10 interactions (immediate context)
   - Last hour (session context)
   - Last day (episodic context)
4. Detect session boundaries (idle >10min = new session)

### OUTPUT:
Temporal context → cm.u (for storage), gm.u (for goal generation)

### ENABLES:
- Continuity ("you mentioned X earlier")
- Anaphora resolution ("it" refers to previous noun)
- Causal reasoning ("because you said X, I did Y")

```unit
gm.u - Goals & Motivation
```
### INPUTS:
- Temporal context from ti.u
- System state from sa.u
- Memory from cm.u

### PROCESS:
1. Detect user intent (reactive goals)
2. Generate autonomous goals:
   - Homeostatic (memory limit approaching)
   - Exploratory (try new pattern)
   - Meta (improve accuracy)
3. Prioritize goals (utility function)
4. Emit top goal to ie.u for execution

### OUTPUT:
Goal stack → ie.u executes, dbt.u logs

### TYPES:
- Reactive: "user asked for balance"
- Homeostatic: "prune old memories"
- Exploratory: "test new greeting pattern"
- Meta: "improve intent classification"

```unit
nlp.u - Natural Language Processor
```
### INPUTS:
- Text from pce.u (parsing)
- Intent from gm.u (composition)

### PARSING PIPELINE:
1. Tokenize (split words, punctuation)
2. POS tag (noun, verb, adjective)
3. Dependency parse (subject-verb-object)
4. Intent extraction (pattern matching)
5. Entity recognition (dates, numbers, names)

### COMPOSITION PIPELINE:
1. Select template (based on intent)
2. Fill slots (insert variables)
3. Apply grammar rules (agreement, tense)
4. Surface realization (generate final text)

### NO LLM:
- Rule-based parsing (regex, grammar rules)
- Template-based generation
- Pattern library (grows via dbt.u)

### OUTPUT:
Parsed intent → gm.u, cm.u
Generated response → ui.u

```unit
cm.u - Core Memory
```
### INPUTS:
- ContextFrames from ti.u (store)
- Queries from gm.u, nlp.u (retrieve)

### STORAGE:
- Episodic: What happened (timestamped events)
- Semantic: What things mean (facts, definitions)
- Procedural: How to do things (skills, procedures)

### RETRIEVAL:
- Recency (recent events weighted higher)
- Frequency (repeated patterns)
- Salience (high-attention events)
- Similarity (cosine on feature vectors)

### OPERATIONS:
- store(context) → save to IndexedDB
- query(keywords, limit) → retrieve matches
- forget(id) → mark as deleted
- consolidate() → merge similar memories (background task)

### WORKER:
Offloads to memory.worker.js (async DB operations)

```unit
dbt.u - Delta & Learning Ledger
```
### INPUTS:
- Outcome feedback from ee.u
- Pattern usage from nlp.u, cm.u

### PROCESS:
1. Log delta (before/after state change)
2. Update pattern confidence:
   - Success → increase confidence
   - Failure → decrease confidence
3. Prune dead patterns (confidence < threshold)
4. Promote strong patterns (confidence > threshold)

### DELTA TYPES:
- Pattern confidence shift
- Skill procedure modification
- Concept definition update

### OUTPUT:
Append-only log → IndexedDB (statik_logs)
Updated patterns → nlp.u, cm.u

### LEARNING:
System "learns" by adjusting pattern weights based on outcomes
No backpropagation, just delta tracking

```unit
ee.u - Evaluation & Error
```
### INPUTS:
- Predicted outcome from ie.u (before action)
- Actual outcome from ie.u (after action)

### PROCESS:
1. Compare prediction vs outcome
2. If mismatch:
   - Log error
   - Emit error signal → dbt.u (decrease confidence)
   - Trigger corrective goal → gm.u
3. If match:
   - Emit success signal → dbt.u (increase confidence)

### ERROR TYPES:
- Prediction mismatch (expected X, got Y)
- Action failure (tried to do X, didn't work)
- Constraint violation (broke ec.u rule)

### FEEDBACK LOOP:
ee.u → dbt.u → pattern update → nlp.u/cm.u → better predictions

```unit
sa.u - Self Model & Awareness
```
### MAINTAINS:
#### 1. Capability registry:
   - Can parse text: true
   - Can access network: false (no CORS bypass)
   - Can see images: false (no vision model)
   
#### 2. State awareness:
   - Currently processing goal: "respond to balance query"
   - Memory usage: 45MB / 100MB
   - Uptime: 3h 24m
   
#### 3. Confidence tracking:
   - Intent classification accuracy: 82%
   - Pattern match success rate: 76%
   - Goal completion rate: 91%

### USAGE:
- nlp.u asks "can I do X?" → sa.u answers
- ui.u displays system status
- ec.u checks capabilities before allowing actions

### HONESTY:
Instead of hallucinating, system refuses tasks outside capabilities
"I can't check weather. I'm client-side only."(Until it finds how to access and utilize other applications on device, need this module)

```unit
ie.u - Intent Execution
```
### INPUTS:
- Goals from gm.u

### PROCESS:
1. Validate goal (check ec.u constraints)
2. Predict outcome (based on past patterns)
3. Execute action:
   - UI update (DOM manipulation)
   - Storage write (IndexedDB)
   - Network call (fetch)
4. Observe outcome
5. Report to ee.u (prediction vs actual)

### ACTIONS:
- ui.update({text: "..."})
- storage.write({...})
- network.fetch({url, method, body})

### SAFETY:
- All actions pass through ec.u first
- Rollback on error (transactional)

```unit
ec.u - Constraints & Ethics
```
### HARD RULES:
#### 1. Never write to storage without user seeing what's being written
#### 2. Never make network calls to unknown domains
#### 3. Never execute arbitrary code from external sources
#### 4. Never pretend to be human
#### 5. Never lie about capabilities

### IMPLEMENTATION:
State machine with forbidden transitions
If ie.u proposes action violating rule → ec.u vetoes

### CANNOT BE DISABLED:
Even in dev mode, constraints remain active

```unit
hc.u - Homeostasis
```
### MONITORS:
- Memory usage (IndexedDB quota)
- CPU usage (throttle if >80%)
- Worker health (restart if crashed)
- Goal queue depth (prevent overflow)

### ACTIONS:
- Prune old memories (trigger cm.u cleanup)
- Pause learning (stop dbt.u temporarily)
- Throttle processing (slow down as.u)
- Request more quota (if available)

### PREVENTS:
- Memory exhaustion
- CPU runaway
- System instability

```unit
sync.u - Federation (Optional)
```
### MECHANISMS:
- WebRTC (peer-to-peer sync)
- BroadcastChannel (same-origin tabs)
- Export/import (JSON snapshots)

### USE CASES:
- Sync memories across devices (phone + laptop)
- Share patterns with other instances
- Backup to external storage

### MUST BE OPT-IN:
User controls what syncs where
No automatic external connections

```unit
ui.u - User Interface
```
### COMPONENTS:
- Chat window (primary interaction)
- Memory inspector (view stored memories)
- Goal viewer (current goals, queue)
- Action log (recent actions)
- System controls (pause, reset, export)

### TRANSPARENCY:
User sees everything:
- What system is thinking (current goal)
- What it remembers (memory viewer)
- What it's doing (action log)
- Why it did something (trace viewer)

### CONTROL:
User can:
- Pause system (stop all processing)
- Reset unit (restart individual unit)
- Export state (download sfti.iso)
- Clear memories (selective or full wipe)

```unit
telemetry.u - Observability
```
### METRICS (LOCAL ONLY):
- Message throughput (msgs/sec per channel)
- Unit CPU time (ms per unit)
- Memory usage (MB per unit)
- Error rates (errors/min)
- Goal completion time (ms per goal)

### VIEWS:
- Performance dashboard
- Trace viewer (message flow visualization)
- Unit health (status of each unit)

### NO EXTERNAL LOGGING:
All metrics stay local unless user explicitly exports

```unit
dev.u - Developer Tools
```
### FEATURES:
#### 1. Simulation mode:
   - Inject fake inputs
   - Test responses without user interaction
   
#### 2. Time travel:
   - Replay message history
   - Step through execution
   
#### 3. Unit isolation:
   - Test single unit in isolation
   - Mock other units
   
#### 4. Chaos testing:
   - Randomly drop messages
   - Simulate crashes
   - Test recovery

### UI:
Accessible via special URL param: ?dev=true

---

# V. What’s Still Missing (Engineering Gaps)
## A. Testing Infrastructure
```txt
tests/
├─ unit/
│  ├─ pce.test.js
│  ├─ nlp.test.js
│  └─ cm.test.js
├─ integration/
│  ├─ boot.test.js
│  ├─ message-flow.test.js
│  └─ storage.test.js
└─ e2e/
   ├─ user-interaction.test.js
   └─ self-modification.test.js
```

## B. Migration System
```browser
// storage/migrations.js
```
### PURPOSE:
When schemas change, migrate existing data

### EXAMPLE:
Version 0.1.0 → 0.2.0
- Added "confidence" field to concepts
- Migration: Set all existing concepts.confidence = 0.5

## C. Error Reporting UI
```browser
// ui/error-reporter.js
```
When system encounters error:
1. Show user-friendly message
2. Offer "Report Issue" button
3. Generates diagnostic bundle (logs, state, context)
4. User can download or ignore

## D. Performance Budgets
```json
// configs/constraints.json
{
  "cpu": {
    "max_per_unit_ms": 50,
    "max_total_percent": 80
  },
  "memory": {
    "max_indexeddb_mb": 100,
    "max_opfs_mb": 500
  },
  "messages": {
    "max_queue_depth": 1000,
    "max_throughput_per_sec": 100
  }
}
```

## E. Security Hardening
```json
// CSP headers (Content Security Policy)
// Service Worker security
// Input sanitization (prevent XSS)
// OPFS access controls
```

---

# VI. Phased Build Plan (To be critiqued)
### Phase 1: Foundation     
- kernel.u, bus.u, lifecycle
- Basic storage (IndexedDB wrapper)
- Boot sequence
- Simple UI (chat window only)

### Phase 2: Core Units
- pce.u, as.u, ti.u
- cm.u (memory storage/retrieval)
- nlp.u (basic parsing, templates)
- ie.u (action execution)

### Phase 3: Learning
- gm.u (goal generation)
- ee.u (error detection)
- dbt.u (delta logging)
- Pattern confidence updates

### Phase 4: Self-Hosting
- VFS (virtual file system)
- Monaco editor integration
- sfti.iso/.ipa generation
- Self-modification UI

### Phase 5: iOS Optimization
- OPFS adapter
- WebGPU compute
- Hardware sensors
- PWA polish (icons, shortcuts)

This is the complete blueprint(ish)