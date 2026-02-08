# docs/API.md - COMPLETE VERSION

```markdown
# Statik.ai API Reference

**Version:** 0.1.0  
**Last Updated:** February 7, 2026

---

## Overview

Complete API reference for Statik.ai cognitive runtime. Covers:
- **Internal APIs:** Unit-to-unit communication via message bus
- **External APIs:** User/developer interaction interfaces
- **Platform APIs:** Adapters, workers, runtime components

**Note:** For detailed implementation specs, see corresponding .md files (Units.md, Bus_RunTime.md, etc.)

---

## Table of Contents

1. [Message Bus API](#message-bus-api)
2. [Core Unit APIs](#core-unit-apis)
3. [Runtime APIs](#runtime-apis)
4. [Adapter APIs](#adapter-apis)
5. [Worker APIs](#worker-apis)
6. [Storage APIs](#storage-apis)
7. [UI Component APIs](#ui-component-apis)
8. [Bootstrap & Kernel APIs](#bootstrap--kernel-apis)
9. [Protocol APIs](#protocol-apis)
10. [Developer Tool APIs](#developer-tool-apis)
11. [External APIs](#external-apis)
12. [Error Handling](#error-handling)
13. [Performance Guarantees](#performance-guarantees)
14. [Security](#security)

---

## Message Bus API

Central communication hub. All units communicate via bus (zero coupling).

### `bus.emit(topic, payload)`
**Purpose:** Fire-and-forget message to all subscribers  
**Parameters:**
- `topic` (string): Message topic (e.g., 'context.new')
- `payload` (object): Message data (validated against schema)
**Returns:** void  
**Throws:** ValidationError if payload invalid  
**Example:**
```javascript
bus.emit('context.new', {
  id: 'ctx_123',
  timestamp: Date.now(),
  source: 'ui.input',
  raw: 'Hello world',
  tokens: ['hello', 'world'],
  novelty_score: 0.85
});
```

### `bus.on(topic, callback)`
**Purpose:** Subscribe to topic  
**Parameters:**
- `topic` (string): Topic pattern (supports wildcards: `unit.*`)
- `callback` (function): Handler function `(payload) => void`
**Returns:** Unsubscribe function  
**Example:**
```javascript
const unsub = bus.on('context.*', (context) => {
  console.log('Context received:', context);
});
// Later: unsub();
```

### `bus.request(topic, payload, timeout=5000)`
**Purpose:** Request-response pattern (RPC)  
**Parameters:**
- `topic` (string): Target topic
- `payload` (object): Request data
- `timeout` (number): Max wait time (ms)
**Returns:** Promise resolving to response  
**Throws:** TimeoutError if no response  
**Example:**
```javascript
const result = await bus.request('nlp.parse', {
  text: 'What is my balance?'
}, 3000);
// result: {intent: 'query.balance', confidence: 0.82}
```

### `bus.stream(topic, payload)`
**Purpose:** Continuous data stream  
**Parameters:**
- `topic` (string): Stream source topic
- `payload` (object): Initial request
**Returns:** AsyncIterator  
**Example:**
```javascript
const stream = bus.stream('sensor.motion');
for await (const data of stream) {
  console.log('Motion:', data);
}
```

---

## Core Unit APIs

### pce.u - Perception & Context Encoder

Processes all inputs into ContextFrames.

#### `processInput(rawInput)`
**Purpose:** Convert raw input to ContextFrame  
**Parameters:**
- `rawInput` (string|object): User input or sensor data
**Returns:** ContextFrame object  
**Emits:** `context.new`  
**Example:**
```javascript
const context = pce.processInput('Hello, how are you?');
// ContextFrame: {id, timestamp, tokens, novelty_score, ...}
```

#### `calculateNovelty(input)`
**Purpose:** Score input novelty (0-1)  
**Parameters:**
- `input` (string): Input text
**Returns:** number (0 = seen before, 1 = completely novel)  
**Algorithm:** Hash-based comparison with sliding window (last 100 inputs)

#### `tokenize(text)`
**Purpose:** Split text into tokens  
**Returns:** string[] (tokens)

---

### as.u - Attention & Salience

Filters which contexts deserve processing.

#### `filterContext(context)`
**Purpose:** Determine if context is salient  
**Parameters:**
- `context` (ContextFrame): Context to evaluate
**Returns:** void (emits to 'context.salient' if salient)  
**Scoring dimensions:**
- Novelty (weight 0.3)
- Urgency (weight 0.4)
- Goal alignment (weight 0.2)
- Resource cost (weight 0.1)
**Threshold:** score > 0.5 → salient

#### `calculateSalience(context)`
**Purpose:** Compute salience score  
**Returns:** number (0-1)

#### `deduplicateContexts(contexts)`
**Purpose:** Remove duplicate contexts  
**Returns:** ContextFrame[] (unique contexts)

---

### ti.u - Temporal Integrator

Builds continuity over time.

#### `addToTimeline(context)`
**Purpose:** Add context to timeline with temporal metadata  
**Parameters:**
- `context` (ContextFrame): Context to add
**Side effects:** Emits to 'context.temporal'  
**Adds metadata:**
- `sequenceNum`: Position in timeline
- `sessionId`: Current session identifier
- `prevContext`: Link to previous context
- `timeSinceLast`: Milliseconds since last context

#### `buildCausalChain(context)`
**Purpose:** Link context to related previous contexts  
**Returns:** ContextFrame[] (chain: [ctx1 → ctx2 → current])  
**Criteria:** Same topic, <5min apart, same session

#### `getSlidingWindow(windowSize=10)`
**Purpose:** Get recent context window  
**Returns:** ContextFrame[] (last N contexts)

#### `detectSessionBoundary()`
**Purpose:** Check if new session should start  
**Returns:** boolean (true if >10min idle)

---

### gm.u - Goals & Motivation

Generates autonomous goals.

#### `generateGoals(context)`
**Purpose:** Create goals based on context and system state  
**Parameters:**
- `context` (ContextFrame): Current context
**Side effects:** Emits to 'goal.new'  
**Goal types:**
- Reactive (respond to user)
- Homeostatic (maintain system health)
- Exploratory (try new behaviors, if autonomy high)

#### `createReactiveGoal(context)`
**Purpose:** Goal from user intent  
**Returns:** Goal object  
**Example:**
```javascript
// User: "What is my balance?"
// Goal: {type: 'respond.query', priority: 10, deadline: now+5s}
```

#### `createHomeostaticGoal()`
**Purpose:** Goal for system maintenance  
**Example:**
```javascript
// Memory > 90MB
// Goal: {type: 'prune.memories', priority: 3, deadline: now+1h}
```

#### `createExploratoryGoal()`
**Purpose:** Goal for learning new patterns  
**Requires:** autonomy_level = 'high'  
**Example:**
```javascript
// Goal: {type: 'test.new_greeting', priority: 1, deadline: null}
```

#### `prioritizeGoals()`
**Purpose:** Sort goal queue by priority and deadline  
**Returns:** Goal (highest priority goal)

#### `updateGoalQueue(goalResult)`
**Purpose:** Update queue based on goal outcome  
**Parameters:**
- `goalResult` (object): {goalId, success, outcome}

---

### nlp.u - Natural Language Processor

Parse and compose language.

#### `parseIntent(text)`
**Purpose:** Extract intent from text  
**Parameters:**
- `text` (string): Input text
**Returns:** Promise<{intent, entities, confidence}>  
**Pattern matching:** Regex-based rules  
**Example:**
```javascript
const parsed = await nlp.parseIntent('Transfer $100 to Alice');
// {
//   intent: 'command.transfer',
//   entities: [
//     {type: 'amount', value: 100},
//     {type: 'recipient', value: 'Alice'}
//   ],
//   confidence: 0.91
// }
```

#### `composeResponse(intent, slots)`
**Purpose:** Generate natural language response  
**Parameters:**
- `intent` (string): Response intent
- `slots` (object): Variables to fill
**Returns:** string  
**Template-based:** Fills slots into templates  
**Example:**
```javascript
const response = nlp.composeResponse('respond.balance', {amount: 1234.56});
// "Your balance is $1,234.56"
```

#### `matchPattern(tokens, patterns)`
**Purpose:** Match tokens against intent patterns  
**Returns:** {pattern, confidence}

---

### cm.u - Core Memory

Episodic, semantic, procedural storage.

#### `storeEpisode(context)`
**Purpose:** Save episodic memory  
**Parameters:**
- `context` (ContextFrame): Context to remember
**Returns:** Promise<episode_id>  
**Storage:** IndexedDB episodes table  
**Example:**
```javascript
await cm.storeEpisode(context);
```

#### `retrieveMemories(query, limit=10)`
**Purpose:** Semantic search over memories  
**Parameters:**
- `query` (string): Search query
- `limit` (number): Max results
**Returns:** Promise<Memory[]>  
**Scoring:** Recency + Frequency + Salience + Similarity (TF-IDF)  
**Example:**
```javascript
const memories = await cm.retrieveMemories('What did I say about trading?', 5);
```

#### `storeConcept(name, definition, relations)`
**Purpose:** Save semantic knowledge  
**Returns:** Promise<concept_id>

#### `storeSkill(name, procedure, success_rate)`
**Purpose:** Save procedural knowledge  
**Returns:** Promise<skill_id>

#### `consolidateMemories()`
**Purpose:** Background memory consolidation  
**Actions:**
- Merge similar episodes
- Strengthen frequently accessed memories
- Prune low-salience old memories
**Trigger:** Scheduled by hc.u

---

### dbt.u - Delta & Learning Ledger

Tracks changes, enables learning.

#### `logDelta(deltaType, before, after, evidence, reason)`
**Purpose:** Log a learning delta  
**Parameters:**
- `deltaType` (string): 'pattern.confidence' | 'skill.success_rate' | 'concept.relation'
- `before` (any): Previous value
- `after` (any): New value
- `evidence` (string): Context ID supporting change
- `reason` (string): Human-readable explanation
**Storage:** Append-only log in IndexedDB  
**Example:**
```javascript
dbt.logDelta(
  'pattern.confidence',
  0.65,
  0.72,
  'ctx_abc123',
  'user responded positively'
);
```

#### `updatePatternConfidence(patternId, outcome)`
**Purpose:** Adjust pattern confidence based on outcome  
**Parameters:**
- `patternId` (string): Pattern identifier
- `outcome` ('success'|'failure'): Outcome
**Algorithm:**
- Success: confidence = min(1.0, current + 0.05)
- Failure: confidence = max(0.0, current - 0.10)
**Side effects:** Logs delta, updates nlp.u  
**Example:**
```javascript
dbt.updatePatternConfidence('greeting_casual', 'success');
// Pattern confidence: 0.65 → 0.70
```

#### `updateSkillSuccessRate(skillId, outcome)`
**Purpose:** Update skill success rate  
**Algorithm:** Running average

#### `pruneDeadPatterns()`
**Purpose:** Remove low-confidence patterns  
**Criteria:** confidence < 0.2 for >30 days

#### `promoteStrongPatterns()`
**Purpose:** Mark high-confidence patterns as trusted  
**Criteria:** confidence > 0.85 for >7 days

#### `getDeltaHistory(targetId, limit=100)`
**Purpose:** Get learning history for pattern/skill/concept  
**Returns:** Delta[]

---

### ee.u - Evaluation & Error

Detects when predictions fail.

#### `recordPrediction(actionId, predicted_outcome)`
**Purpose:** Record prediction before action  
**Parameters:**
- `actionId` (string): Action identifier
- `predicted_outcome` (any): Expected outcome
**Storage:** In-memory map until outcome received

#### `recordOutcome(actionId, actual_outcome)`
**Purpose:** Record actual outcome and compare to prediction  
**Side effects:** Emits 'error.detected' or 'success.confirmed'

#### `evaluateAction(actionId, prediction, outcome)`
**Purpose:** Compare prediction vs actual  
**Returns:** {match: boolean, error_type, severity, context}  
**Error types:**
- 'prediction_mismatch'
- 'action_failure'
- 'constraint_violation'
- 'timeout'
- 'unexpected_state'

#### `calculateSeverity(error)`
**Purpose:** Rate error severity  
**Returns:** number (1-10)  
**Scale:**
- Critical (9-10): System crash, data loss
- High (7-8): Feature broken
- Medium (4-6): Incorrect response
- Low (1-3): Minor glitch

#### `triggerCorrection(error)`
**Purpose:** Initiate corrective action  
**Actions:**
- If severity >= 7: Emit corrective goal to gm.u
- If pattern-related: Send delta to dbt.u (decrease confidence)
- If skill-related: Send failure to dbt.u

---

### sa.u - Self Model & Awareness

Knows what system can/can't do.

#### `registerCapability(category, capability, available)`
**Purpose:** Register system capability  
**Parameters:**
- `category` (string): 'language' | 'vision' | 'audio' | 'network' | 'storage'
- `capability` (string): Specific capability
- `available` (boolean): Is it available?
**Example:**
```javascript
sa.registerCapability('language', 'parse_text', true);
sa.registerCapability('vision', 'understand_images', false);
```

#### `queryCapability(capability)`
**Purpose:** Check if system can do something  
**Returns:** {available, limitations, confidence}  
**Used by:** ie.u before attempting actions

#### `getSystemLimitations()`
**Purpose:** List known limitations  
**Returns:** string[] (limitation descriptions)  
**Example:**
```javascript
[
  "Cannot access network (CORS)",
  "Cannot see images (no vision model)",
  "English language only",
  "Max memory: 100MB"
]
```

#### `trackConfidence(domain, confidence)`
**Purpose:** Store confidence per capability  
**Example:** "Intent classification: 82%"

#### `getCurrentState()`
**Purpose:** Get current system state  
**Returns:**
```javascript
{
  mode: 'normal' | 'safe' | 'degraded',
  uptime: 1234567,
  memory_used: 45,
  active_units: 15,
  current_goal: 'respond.query',
  processing: true
}
```

#### `canDo(action)`
**Purpose:** Check if action is possible  
**Returns:** boolean  
**Used by:** ie.u and nlp.u to avoid hallucinations

---

### ie.u - Intent Execution

Turns goals into actions.

#### `executeGoal(goal)`
**Purpose:** Execute a goal  
**Parameters:**
- `goal` (Goal): Goal object from gm.u
**Process:**
1. Validate with sa.u (can system do this?)
2. Check ec.u (is this allowed?)
3. Predict outcome (for ee.u)
4. Execute action
5. Observe outcome
6. Report to ee.u

#### `executeAction(action)`
**Purpose:** Execute specific action  
**Action types:**
- `ui.update`: Update UI element
- `storage.write`: Write to storage
- `network.call`: Make network request
- `eval.code`: Execute code (sandboxed)

#### `updateUI(element, content)`
**Purpose:** Update UI  
**Emits:** 'ui.render'

#### `writeStorage(store, data)`
**Purpose:** Write to storage  
**Validates:** Against schema

#### `makeNetworkCall(url, method, body)`
**Purpose:** Make network request  
**Checks:** Network availability

#### `evaluateCode(code)`
**Purpose:** Execute code in sandboxed scope  
**Used by:** bridge.u for remote commands

#### `predictOutcome(action)`
**Purpose:** Predict action outcome  
**Based on:** Past action results  
**Sent to:** ee.u for comparison

#### `rollbackAction(actionId)`
**Purpose:** Rollback failed transaction  
**Example:** Partial storage write → delete incomplete data

---

### ec.u - Constraints & Ethics

Hard boundaries on behavior (immutable).

#### `validateAction(action)`
**Purpose:** Check action against constraint rules  
**Parameters:**
- `action` (Action): Action to validate
**Returns:** {allowed: boolean, violatedRule: null | ruleId}  
**Process:** Run through all HARD_RULES, if any return false → DENY

#### `checkRule(rule, action)`
**Purpose:** Execute single rule check  
**Returns:** boolean

#### `enforceConstraint(action, violation)`
**Purpose:** Block action if constraint violated  
**Side effects:**
- Emit 'action.denied' to ie.u
- Log violation to telemetry.u
- Alert user (if critical)

#### `logViolation(action, rule)`
**Purpose:** Permanent audit log of blocked actions  
**Storage:** Append-only log

**HARD_RULES (examples):**
- `no_blind_storage`: Never write without user seeing
- `no_unknown_network`: Never call unknown domains
- `no_arbitrary_code`: Never execute external code
- `no_impersonation`: Never pretend to be human
- `no_capability_lies`: Never lie about capabilities

---

### hc.u - Homeostasis

Maintains system stability.

#### `monitorHealth()`
**Purpose:** Check system health metrics  
**Checks:**
- Memory usage (IndexedDB + heap)
- CPU usage
- Goal queue depth
- Message bus throughput
- Worker health
**Runs:** Every 10 seconds

#### `checkMemoryUsage()`
**Purpose:** Monitor storage usage  
**Thresholds:**
- >90%: Emit 'goal.cleanup' to gm.u
- >95%: Trigger emergency prune
- >98%: Pause learning

#### `pruneMemories()`
**Purpose:** Delete low-salience old memories  
**Target:** Free 20% of used space  
**Priority:** Oldest, least accessed, lowest salience

#### `checkCPUUsage()`
**Purpose:** Monitor CPU usage  
**Thresholds:**
- >80%: Throttle low-priority tasks
- >90%: Pause background tasks
- >95%: Emergency pause non-critical units

#### `checkQueueDepth()`
**Purpose:** Monitor message bus queue  
**Thresholds:**
- >500: Drop low-priority messages
- >1000: Aggressive throttling
- >2000: Pause processing, alert user

#### `checkWorkers()`
**Purpose:** Ping workers for health  
**Action:** If unresponsive >5s → restart worker

#### `pauseLearning()` / `resumeLearning()`
**Purpose:** Control learning based on resources

#### `emergencyShutdown()`
**Purpose:** Last resort if system critically unstable  
**Actions:** Save state, stop all units, enter safe mode

---

### sync.u - Sync & Federation

Share state between instances.

#### `syncMemories(targetInstance)`
**Purpose:** Sync memories with another instance  
**Parameters:**
- `targetInstance` (string): Instance ID
**Process:**
1. Export memories from cm.u
2. Filter: only user-approved
3. Send via mesh.u (P2P)
4. Merge incoming (conflict resolution)

#### `syncPatterns(targetInstance)`
**Purpose:** Sync learned patterns  
**Conflict resolution:** Take higher confidence

#### `exportState(selective=false)`
**Purpose:** Generate JSON snapshot  
**Returns:** State object  
**Format:**
```javascript
{
  instance_id: 'statik_phone_abc',
  timestamp: Date.now(),
  memories: [...],
  patterns: {...},
  skills: [...],
  metadata: {...}
}
```

#### `importState(snapshot, merge=true)`
**Purpose:** Restore from snapshot  
**Parameters:**
- `snapshot` (object): State snapshot
- `merge` (boolean): Merge or replace?

#### `configureSyncPolicy(policy)`
**Purpose:** Set sync preferences  
**Policy:**
```javascript
{
  sync_memories: true,
  sync_patterns: true,
  sync_skills: false,
  auto_sync: false,
  trusted_instances: ['statik_laptop_xyz']
}
```

#### `getSyncStatus()`
**Purpose:** Get sync status  
**Returns:** {last_sync, pending_changes, conflicts}

---

### ui.u - User Interface

Manages DOM and user interaction.

#### `renderShell()`
**Purpose:** Create main UI shell  
**Components:** Header, chat container, inspector, footer

#### `renderChat()`
**Purpose:** Initialize chat interface

#### `renderInspector()`
**Purpose:** Load inspector panels

#### `renderControls()`
**Purpose:** Render pause/reset/export buttons

#### `handleUserInput(text)`
**Purpose:** Capture user input  
**Emits:** 'ui.input' → pce.u

#### `displayMessage(message)`
**Purpose:** Append message to chat  
**Styling:** User vs system messages

#### `updateStatus(status)`
**Purpose:** Update system status indicator  
**Colors:** green=ready, yellow=processing, red=error

#### `showNotification(notification)`
**Purpose:** Toast/banner for events

#### `updateMemoryView(memories)` / `updateGoalView(goals)` / `updateTraceView(messages)` / `updatePerformanceView(metrics)`
**Purpose:** Update inspector panels

#### `saveUIState()` / `restoreUIState()`
**Purpose:** Persist UI preferences

---

### telemetry.u - Observability

Metrics, logs, traces.

#### `recordMetric(category, metric, value)`
**Purpose:** Record a metric  
**Categories:** 'performance', 'usage', 'errors'  
**Example:**
```javascript
telemetry.recordMetric('performance', 'message_latency_ms', 15);
```

#### `aggregateMetrics()`
**Purpose:** Compute averages, percentiles  
**Runs:** Every 10 seconds

#### `logEvent(level, unit, message, context)`
**Purpose:** Log an event  
**Levels:** 'debug', 'info', 'warn', 'error', 'critical'  
**Structure:**
```javascript
{
  timestamp: Date.now(),
  level: 'info',
  unit: 'nlp.u',
  message: 'Parsed intent: query.balance',
  context: {intent: '...', confidence: 0.82}
}
```

#### `traceMessage(message)`
**Purpose:** Record message flow  
**Tracks:** source → target → latency → outcome

#### `getMessageTrace(messageId)`
**Purpose:** Get complete message path  
**Returns:** [pce.u → as.u → ti.u → gm.u]

#### `startTimer(operation)` / `endTimer(timerId)`
**Purpose:** Performance timing  
**Example:**
```javascript
const t = telemetry.startTimer('nlp.parse');
await nlp.parse(text);
telemetry.endTimer(t); // Records: nlp.parse_duration_ms
```

#### `recordError(error, context)`
**Purpose:** Capture error details

#### `getDashboardMetrics()`
**Purpose:** Summary for UI inspector  
**Returns:**
```javascript
{
  message_throughput: 45, // msgs/sec
  avg_latency: 12, // ms
  memory_usage: 67, // MB
  cpu_usage: 23, // %
  error_rate: 0.02, // %
  units_active: 15
}
```

#### `exportLogs(filter)`
**Purpose:** Export logs for debugging  
**Returns:** JSON or CSV

---

### dev.u - Developer Tools

Debugging, testing, inspection.

#### `simulateInput(input)`
**Purpose:** Inject fake user input  
**Example:**
```javascript
dev.simulateInput('What is 2+2?');
```

#### `simulateEvent(event)`
**Purpose:** Trigger any bus event manually

#### `replayMessages(startTime, endTime)`
**Purpose:** Replay message history  
**Speed:** 10x

#### `stepThrough(messageId)`
**Purpose:** Step through message flow

#### `isolateUnit(unitId)`
**Purpose:** Disable all other units  
**Use:** Test single unit

#### `mockUnit(unitId, behavior)`
**Purpose:** Replace real unit with mock

#### `injectErrors(rate=0.1)`
**Purpose:** Randomly drop messages (chaos testing)

#### `crashUnit(unitId)`
**Purpose:** Force unit to crash (test watchdog)

#### `overloadSystem()`
**Purpose:** Flood message bus (test backpressure)

#### `inspectUnitState(unitId)`
**Purpose:** Return complete unit state

#### `compareStates(snapshot1, snapshot2)`
**Purpose:** Diff two state snapshots

#### `setBreakpoint(unitId, event)` / `resume()`
**Purpose:** Pause execution for debugging

#### `startProfiling()` / `stopProfiling()`
**Purpose:** Record execution times

#### `assert(condition, message)`
**Purpose:** Test system behavior

---

### bridge.u - Debug Bridge

Remote control from Python server.

#### `detectDebugServer()`
**Purpose:** Find debug server on network  
**Tries:** localhost, 192.168.1.x range  
**Pings:** /debug/ping endpoint

#### `startPolling()`
**Purpose:** Poll /cmd endpoint every 2 seconds

#### `executeCommand(cmd)`
**Purpose:** Execute remote command  
**Commands:**
- `reload`: window.location.reload()
- `screenshot`: Capture viewport as base64
- `eval`: eval(cmd.code) in safe scope
- `getState`: Return kernel.getStatus()
- `click`: Click element by selector
- `type`: Fill input field
- `scroll`: Scroll to position
- `test`: Run specific test

#### `takeScreenshot()`
**Purpose:** Capture entire viewport  
**Library:** html2canvas  
**Returns:** base64 data URL

#### `interceptConsole()`
**Purpose:** Send all console logs to /debug/log

#### `streamBusMessages()`
**Purpose:** Send bus messages to /debug/message

#### `sendStateSnapshot()`
**Purpose:** POST unit states to /debug/state (every 1s)

#### `sendPerformanceMetrics()`
**Purpose:** POST telemetry to /debug/performance (every 5s)

#### `sendResponse(cmdId, result)`
**Purpose:** Send command result back to server

---

### disc.u - Discovery

Find other Statik.ai instances.

#### `announcePresence()`
**Purpose:** Broadcast on local network  
**Protocol:** mDNS/Bonjour  
**Service:** _statik._tcp.local

#### `listenForPeers()`
**Purpose:** Listen for mDNS announcements

#### `createBroadcastChannel()`
**Purpose:** For multiple tabs/windows on same device  
**Channel:** 'statik-instances'

#### `postAnnouncement()`
**Purpose:** Announce via BroadcastChannel  
**Message:**
```javascript
{
  type: 'announce',
  instance_id: 'statik_phone_abc',
  capabilities: ['storage', 'compute'],
  endpoints: ['http://localhost:8080']
}
```

#### `connectToSignalServer()`
**Purpose:** WebRTC signaling for remote discovery  
**Uses:** Public STUN server or IPFS pubsub

#### `getDiscoveredPeers()`
**Purpose:** Return list of discovered instances  
**Returns:** Array<{instance_id, last_seen, capabilities}>

#### `sendHeartbeat()`
**Purpose:** Announce still alive (every 30s)

#### `checkPeerHealth()`
**Purpose:** Mark offline if not seen >2min

---

### mesh.u - P2P Mesh Networking

Connect instances via WebRTC.

#### `connectToPeer(instanceId, endpoint)`
**Purpose:** Establish WebRTC connection  
**Process:**
1. Create RTCPeerConnection
2. Generate offer
3. Send via signaling channel
4. Wait for answer
5. Establish data channel

#### `handleIncomingConnection(signal)`
**Purpose:** Accept connection offer

#### `createDataChannel(peerId, label)`
**Purpose:** Create data channel  
**Labels:** 'sync' | 'messages' | 'files'  
**Returns:** RTCDataChannel

#### `sendToPeer(peerId, message)`
**Purpose:** Send message to specific peer

#### `broadcast(message, excludePeer=null)`
**Purpose:** Send to all connected peers

#### `maintainConnections()`
**Purpose:** Monitor connection health (ping/pong)

#### `disconnectPeer(peerId)`
**Purpose:** Close connection

#### `encryptMessage(message, publicKey)` / `decryptMessage(encrypted, privateKey)`
**Purpose:** Optional E2E encryption

---

## Runtime APIs

### scheduler.js - Task Scheduling

#### `schedule(task, priority, deadline=null)`
**Purpose:** Add task to queue  
**Parameters:**
- `task` (function): Task to execute
- `priority` (number): 0-100 (0=urgent, 100=low)
- `deadline` (number|null): Unix timestamp
**Returns:** taskId

#### `executeTasks()`
**Purpose:** Main scheduler loop  
**Behavior:** Dequeue highest priority, execute with timeout

#### `cancelTask(taskId)`
**Purpose:** Remove task from queue

#### `pause()` / `resume()`
**Purpose:** Global scheduler control

---

### allocator.js - Resource Allocation

#### `allocateCPU(unitId, percentRequested)`
**Purpose:** Grant CPU budget to unit  
**Returns:** Allocation token or null (denied)

#### `allocateMemory(unitId, bytesRequested)`
**Purpose:** Reserve memory for unit  
**Returns:** Allocation token

#### `releaseResources(unitId)`
**Purpose:** Free unit's allocations

#### `getCurrentUsage()`
**Purpose:** Get current CPU% and memory usage  
**Returns:** {cpu_percent, memory_mb}

---

### quota.js - Storage Quota Management

#### `checkQuota()`
**Purpose:** Query storage usage  
**Returns:** Promise<{used, available, percent}>  
**API:** navigator.storage.estimate()

#### `requestPersistent()`
**Purpose:** Request persistent storage (won't be evicted)  
**Returns:** Promise<boolean> (granted/denied)  
**API:** navigator.storage.persist()

#### `enforceLimit(store, limitMB)`
**Purpose:** Check if store exceeds limit  
**Action:** Trigger cleanup if over

---

### throttle.js - Rate Limiting

#### `createThrottle(maxRate, window='1s')`
**Purpose:** Create throttle function  
**Parameters:**
- `maxRate` (number): Operations per window
- `window` (string): Time window ('1s', '1m', etc.)
**Returns:** Throttled function

#### `throttle(fn)`
**Purpose:** Wrap function with rate limit  
**Behavior:** Queue calls that exceed rate

#### `backpressure(queueDepth, threshold)`
**Purpose:** Signal producer to slow down  
**Returns:** boolean (true if over threshold)

---

## Adapter APIs

### iOS Adapters

#### hardware.adapter.js

##### `requestCamera()`
**Purpose:** Get camera stream  
**Returns:** Promise<MediaStream>  
**API:** navigator.mediaDevices.getUserMedia({video: true})

##### `capturePhoto()`
**Purpose:** Capture single frame  
**Returns:** Promise<Blob>

##### `startMotionTracking()`
**Purpose:** Listen to DeviceMotionEvent  
**Emits:** 'sensor.motion'

##### `getOrientation()`
**Purpose:** Get device orientation  
**Returns:** {alpha, beta, gamma}

##### `getCurrentPosition()`
**Purpose:** Get geolocation  
**Returns:** Promise<{latitude, longitude, accuracy}>

##### `vibrate(pattern)`
**Purpose:** Trigger haptic feedback  
**Pattern:** [duration, pause, duration]

##### `tapticFeedback(type)`
**Purpose:** iOS-specific haptics  
**Types:** 'success' | 'warning' | 'error'

---

#### storage.adapter.js

##### `getFileSystemRoot()`
**Purpose:** Get OPFS root handle  
**Returns:** Promise<FileSystemDirectoryHandle>

##### `writeFile(path, data)`
**Purpose:** Write to OPFS  
**Returns:** Promise<void>

##### `readFile(path)`
**Purpose:** Read from OPFS  
**Returns:** Promise<string|ArrayBuffer>

##### `deleteFile(path)`
**Purpose:** Remove file from OPFS

##### `listDirectory(path)`
**Purpose:** List files in directory  
**Returns:** Promise<string[]>

##### `checkQuota()`
**Purpose:** Check storage quota  
**Returns:** Promise<{usage, quota, percentUsed}>

##### `requestPersistent()`
**Purpose:** Request persistent storage  
**Returns:** Promise<boolean>

---

#### network.adapter.js

##### `isOnline()`
**Purpose:** Check connection status  
**Returns:** boolean

##### `getConnectionType()`
**Purpose:** Get connection type  
**Returns:** '4g' | '3g' | 'wifi' | 'slow-2g'

##### `onConnectionChange(callback)`
**Purpose:** Listen to connection changes

##### `measureLatency()`
**Purpose:** Ping known endpoint  
**Returns:** Promise<number> (ms)

##### `measureBandwidth()`
**Purpose:** Download small file, calculate speed  
**Returns:** Promise<number> (Mbps)

---

#### permissions.adapter.js

##### `requestPermission(type)`
**Purpose:** Request permission  
**Types:** 'camera' | 'microphone' | 'location' | 'notifications' | 'storage'  
**Returns:** Promise<'granted'|'denied'>

##### `checkPermission(type)`
**Purpose:** Query permission status without prompting  
**Returns:** 'granted' | 'denied' | 'prompt'

##### `requestMultiple(types)`
**Purpose:** Request array of permissions  
**Returns:** Promise<Map<type, status>>

---

### Web Adapters

#### webgpu.adapter.js

##### `createComputePipeline(shaderCode)`
**Purpose:** Compile WGSL shader  
**Returns:** Promise<GPUComputePipeline>

##### `runCompute(pipeline, data)`
**Purpose:** Execute compute shader  
**Returns:** Promise<ArrayBuffer> (result)

##### `parallelSimilaritySearch(query, memories)`
**Purpose:** GPU-accelerated similarity search  
**Returns:** Promise<Memory[]>

---

#### indexeddb.adapter.js

##### `openDatabase(name, version, schema)`
**Purpose:** Open or create IndexedDB  
**Returns:** Promise<IDBDatabase>

##### `transaction(storeName, mode, callback)`
**Purpose:** Wrapper for IndexedDB transactions  
**Modes:** 'readonly' | 'readwrite'  
**Returns:** Promise<any> (callback result)

##### `query(storeName, indexName, query)`
**Purpose:** Query with index  
**Returns:** Promise<any[]>

##### `put(storeName, data)`
**Purpose:** Insert or update record  
**Returns:** Promise<key>

##### `delete(storeName, key)`
**Purpose:** Delete record

##### `clear(storeName)`
**Purpose:** Delete all records

---

#### notifications.adapter.js

##### `requestPermission()`
**Purpose:** Request notification permission  
**Returns:** Promise<'granted'|'denied'>

##### `showNotification(title, options)`
**Purpose:** Show system notification  
**Options:** {body, icon, badge}

##### `onNotificationClick(callback)`
**Purpose:** Handle notification clicks

---

### Universal Adapters

#### crypto.adapter.js

##### `generateKeyPair()`
**Purpose:** Generate RSA key pair  
**Returns:** Promise<{publicKey, privateKey}>

##### `encrypt(data, publicKey)`
**Purpose:** Encrypt with public key  
**Returns:** Promise<ArrayBuffer>

##### `decrypt(encrypted, privateKey)`
**Purpose:** Decrypt with private key  
**Returns:** Promise<ArrayBuffer>

##### `hash(data, algorithm='SHA-256')`
**Purpose:** Hash data  
**Returns:** Promise<string> (hex)

##### `sign(data, privateKey)`
**Purpose:** Digital signature  
**Returns:** Promise<ArrayBuffer>

##### `verify(signature, data, publicKey)`
**Purpose:** Verify signature  
**Returns:** Promise<boolean>

---

#### time.adapter.js

##### `now()`
**Purpose:** High-resolution timestamp  
**Returns:** number (DOMHighResTimeStamp)  
**API:** performance.now()

##### `mark(label)`
**Purpose:** Create named timestamp  
**API:** performance.mark(label)

##### `measure(name, startMark, endMark)`
**Purpose:** Calculate duration between marks  
**API:** performance.measure()

##### `getEntries()`
**Purpose:** Get all performance entries  
**Returns:** PerformanceEntry[]

##### `clearMarks()`
**Purpose:** Clear performance marks

---

## Worker APIs

### cognition.worker.js

#### `onmessage(event)`
**Task types:**
- `pattern_match`: Match text against patterns
- `similarity_score`: TF-IDF + cosine similarity
- `vector_operations`: Add, subtract, normalize vectors
- `batch_processing`: Parallel processing

**Message format:**
```javascript
{
  type: 'pattern_match',
  data: {
    text: '...',
    patterns: [...]
  }
}
```

**Response format:**
```javascript
{
  type: 'pattern_match',
  result: {
    pattern: '...',
    score: 0.85
  }
}
```

---

### memory.worker.js

#### `onmessage(event)`
**Operations:**
- `store`: Insert into IndexedDB
- `retrieve`: Query IndexedDB
- `delete`: Delete from IndexedDB
- `bulk_store`: Transaction-based batch insert

---

### nlp.worker.js

#### `onmessage(event)`
**Tasks:**
- `tokenize`: Split text into tokens
- `pos_tag`: Part-of-speech tagging
- `extract_entities`: Find dates, numbers, names
- `sentiment`: Positive/negative/neutral scoring

---

### compute.worker.js

#### `onmessage(event)`
**Tasks:**
- `hash`: SHA-256 hashing
- `encrypt` / `decrypt`: AES encryption
- `vector_math`: Dot product, normalization
- `statistics`: Mean, median, percentiles

---

## Storage APIs

### db.js - IndexedDB Interface

#### `initializeDatabases()`
**Purpose:** Open all databases  
**Databases:**
- statik_memory (episodes, concepts, skills)
- statik_state (unit_states, kernel_state)
- statik_logs (deltas, errors, actions)
**Returns:** Promise<Map<dbName, IDBDatabase>>

#### `storeEpisode(episode)`
**Purpose:** Save episode to IndexedDB  
**Validates:** Against episodes.schema.json  
**Returns:** Promise<void>

#### `queryEpisodes(query)`
**Purpose:** Query episodes  
**Query format:**
```javascript
{
  timestamp_from: 1234567890,
  timestamp_to: 1234567999,
  tags: ['trading', 'decisions'],
  salience_min: 0.7
}
```
**Returns:** Promise<Episode[]>

#### `storeConcept(concept)` / `storeSkill(skill)`
**Purpose:** Save to respective stores

#### `saveUnitState(unitId, state)` / `loadUnitState(unitId)`
**Purpose:** Unit state snapshots

#### `logDelta(delta)` / `logError(error)` / `logAction(action)`
**Purpose:** Append to logs

#### `vacuumDatabase(dbName)`
**Purpose:** Compact database (reclaim space)

#### `getStorageUsage()`
**Purpose:** Return usage per database  
**Returns:** Promise<Map<dbName, sizeMB>>

---

### migrations.js

#### `runMigrations(db, oldVersion, newVersion)`
**Purpose:** Execute schema migrations  
**Behavior:** Sequential (v1 → v2 → v3)

#### `validateSchema(db, expectedSchema)`
**Purpose:** Verify DB structure  
**Returns:** ValidationResult

---

### backup.js

#### `exportAllData()`
**Purpose:** Export complete system state  
**Returns:** Promise<Blob> (JSON)  
**Structure:**
```javascript
{
  version: '0.1.0',
  timestamp: Date.now(),
  databases: {
    statik_memory: {...},
    statik_state: {...},
    statik_logs: {...}
  },
  metadata: {
    instance_id: '...',
    export_reason: 'manual'
  }
}
```

#### `importData(blob)`
**Purpose:** Restore from backup  
**Side effects:** Overwrites current state, triggers reboot

#### `exportSelective(options)`
**Purpose:** Export only selected data  
**Options:** {memories: true, patterns: false, logs: false}

#### `scheduleAutoBackup(intervalHours)`
**Purpose:** Automatic periodic backups

---

### opfs.js - Origin Private File System

#### `init()`
**Purpose:** Get OPFS root handle  
**Returns:** Promise<FileSystemDirectoryHandle>

#### `writeFile(path, content)`
**Purpose:** Write file to OPFS  
**Creates:** Directories as needed  
**Returns:** Promise<void>

#### `readFile(path)`
**Purpose:** Read file from OPFS  
**Returns:** Promise<string|ArrayBuffer>

#### `deleteFile(path)`
**Purpose:** Remove file

#### `exists(path)`
**Purpose:** Check if file exists  
**Returns:** Promise<boolean>

#### `createDirectory(path)`
**Purpose:** Create nested directories

#### `listFiles(path)`
**Purpose:** List files in directory  
**Returns:** Promise<string[]>

#### `getFileSize(path)`
**Purpose:** Return file size in bytes

#### `writeStream(path)` / `readStream(path)`
**Purpose:** Streaming for large files  
**Returns:** WritableStream | ReadableStream

---

### cache.js - Service Worker Cache

#### `cacheAssets(assets)`
**Purpose:** Add assets to cache  
**Assets:** ['/index.html', '/kernel.u.js', ...]

#### `getCached(url)`
**Purpose:** Retrieve from cache  
**Returns:** Promise<Response|null>

#### `updateCache(url, response)`
**Purpose:** Update cached version

#### `clearCache(cacheName)`
**Purpose:** Delete entire cache

#### `listCached()`
**Purpose:** Return array of cached URLs

---

### vfs.js - Virtual File System

#### `init()`
**Purpose:** Load entire source tree into memory

#### `loadSourceTree()`
**Purpose:** Fetch all source files  
**Returns:** Promise<Map<path, content>>

#### `readFile(path)`
**Purpose:** Return file contents from VFS

#### `writeFile(path, content)`
**Purpose:** Update in-memory version  
**Side effects:** Marks file as modified

#### `listFiles(directory='/')`
**Purpose:** List files in directory

#### `saveAll()`
**Purpose:** Persist all modified files to OPFS

#### `revertFile(path)`
**Purpose:** Discard modifications

#### `getModifiedFiles()`
**Purpose:** Return list of unsaved changes

---

### snapshot.js

#### `createSnapshot()`
**Purpose:** Create .iso snapshot  
**Returns:** Promise<Blob>  
**Includes:** Source + State + Config + Metadata

#### `loadSnapshot(blob)`
**Purpose:** Restore from .iso  
**Side effects:** Complete system replacement, reboot

#### `exportISO()`
**Purpose:** Create self-bootstrapping image  
**Format:** sfti.iso (JSON file)

---

## UI Component APIs

### shell.js

#### `renderShell()`
**Purpose:** Create main layout  
**Elements:** Header, main, footer

#### `toggleInspector()`
**Purpose:** Show/hide inspector panel

#### `updateStatus(status)`
**Purpose:** Update header status indicator

#### `setTheme(theme)`
**Purpose:** Apply CSS theme ('dark' | 'light')

---

### chat.js

#### `renderChat(container)`
**Purpose:** Create chat UI

#### `appendMessage(message, sender)`
**Purpose:** Add message to history  
**Sender:** 'user' | 'system'

#### `handleUserInput()`
**Purpose:** Get text from input, emit to bus

#### `showTypingIndicator()`
**Purpose:** Animated dots while processing

#### `clearMessages()`
**Purpose:** Empty message history

---

### Inspector Components

#### memory.inspector.js

##### `render(container)`
**Purpose:** Create memory viewer UI

##### `loadMemories(limit=50)`
**Purpose:** Query cm.u for recent memories

##### `search(query)`
**Purpose:** Search memories by keyword

##### `deleteMemory(id)`
**Purpose:** Delete specific memory (with confirmation)

---

#### goals.inspector.js

##### `render(container)`
**Purpose:** Show goal queue

##### `loadGoals()`
**Purpose:** Query gm.u for pending goals

##### `cancelGoal(goalId)`
**Purpose:** Remove goal from queue

---

#### trace.inspector.js

##### `render(container)`
**Purpose:** Create trace viewer

##### `loadTrace(messageId)`
**Purpose:** Get message path from telemetry

##### `filterByUnit(unitId)`
**Purpose:** Show only messages to/from unit

---

#### performance.inspector.js

##### `render(container)`
**Purpose:** Create metrics dashboard

##### `updateMetrics()`
**Purpose:** Fetch from telemetry, update charts (every 1s)

##### `renderChart(metric, data)`
**Purpose:** Draw chart (canvas or chart library)

---

### Editor Components

#### monaco.loader.js

##### `loadMonaco()`
**Purpose:** Load Monaco from CDN  
**Returns:** Promise<monaco global>

##### `configureMonaco(monaco)`
**Purpose:** Set theme, language, features

---

#### file.browser.js

##### `render(container)`
**Purpose:** Tree view of files

##### `onFileClick(path)`
**Purpose:** Open file in editor

##### `onFileRightClick(path)`
**Purpose:** Context menu (rename, delete)

---

### Control Components

#### pause.js

##### `renderPauseButton()`
**Purpose:** Create pause/resume button

##### `togglePause()`
**Purpose:** Emit 'system.pause' or 'system.resume'

---

#### reset.js

##### `renderResetButton()`
**Purpose:** Create reset button

##### `confirmReset()`
**Purpose:** Show confirmation dialog

##### `performReset(type)`
**Purpose:** Clear storage, reload

---

#### export.js

##### `renderExportButton()`
**Purpose:** Create export button

##### `triggerExport()`
**Purpose:** Call backup.exportAllData(), download file

---

## Bootstrap & Kernel APIs

### boot.js

#### `boot()`
**Purpose:** Main entry point, orchestrates cold start  
**Sequence:**
1. Run detect.js (check environment)
2. Run hydrate.js (load saved state)
3. Initialize kernel
4. If error → run recover.js
**Returns:** Promise<{success, mode}>

---

### detect.js

#### `detectEnvironment()`
**Purpose:** Check capabilities  
**Tests:** iOS version, browser, WebGPU, OPFS, IndexedDB, Workers  
**Returns:** Promise<Capabilities>  
**Saves to:** configs/capabilities.json

#### `detectAPIs()`
**Purpose:** Test each web API availability

---

### hydrate.js

#### `loadState()`
**Purpose:** Restore system state  
**Process:**
1. Check IndexedDB for saved state
2. If exists: Load unit states, memory, configs
3. If not: Load defaults from configs/defaults.json
**Returns:** Promise<State>

#### `validateState()`
**Purpose:** Ensure loaded state is valid  
**Actions:** Migrate old formats, reset if corrupt

---

### recover.js

#### `enterSafeMode()`
**Purpose:** Disable non-critical units, load minimal UI  
**Options:** "Reset", "Restore Backup", "Continue Anyway"

#### `recoverFromCrash()`
**Purpose:** Analyze crash logs, restart with failing unit disabled

---

### kernel.u.js

#### `boot()`
**Purpose:** Initialize kernel  
**Process:**
1. Initialize bus
2. Load registry
3. Start lifecycle
4. Spawn watchdog
5. Emit 'system.ready'
**Returns:** Promise<void>

#### `getStatus()`
**Purpose:** Return status of all units  
**Returns:**
```javascript
{
  uptime: 1234567,
  units: {
    'pce.u': {state: 'running', health: 'good'},
    'nlp.u': {state: 'running', health: 'good'},
    // ...
  }
}
```

#### `shutdown()`
**Purpose:** Graceful shutdown  
**Process:** Stop units in reverse order, save state

---

### lifecycle.js

#### `initializeUnits()`
**Purpose:** Initialize units by priority  
**Behavior:** Sequential, wait for each ready signal

#### `startUnit(unitId)`
**Purpose:** Start specific unit  
**Returns:** Promise<void>

#### `stopUnit(unitId)`
**Purpose:** Stop specific unit

#### `restartUnit(unitId)`
**Purpose:** Stop then start

---

### registry.js

#### `loadRegistry()`
**Purpose:** Read units.registry.json  
**Returns:** Promise<Registry>

#### `getUnit(id)`
**Purpose:** Return unit metadata  
**Returns:** UnitMetadata | null

#### `getAllUnits()`
**Purpose:** Return all registered units  
**Returns:** UnitMetadata[]

#### `registerUnit(metadata)`
**Purpose:** Add new unit at runtime

---

### watchdog.js

#### `startMonitoring()`
**Purpose:** Begin health checks (every 5s)

#### `checkHealth()`
**Purpose:** Poll each unit for heartbeat  
**Actions:** If unresponsive >5s → restart, if fails 3x → disable

#### `reportCrash(unitId, error)`
**Purpose:** Log crash to telemetry

---

## Protocol APIs

### rpc.js - Request-Response

#### `createRequest(method, params, timeout=5000)`
**Purpose:** Generate request message  
**Returns:** Request object with correlation ID

#### `sendRequest(target, request)`
**Purpose:** Emit via bus, wait for response  
**Returns:** Promise<Response>  
**Throws:** TimeoutError if no reply

#### `createResponse(requestId, result)`
**Purpose:** Generate response message

#### `handleRequest(request, handler)`
**Purpose:** Execute handler, generate response

---

### stream.js - Streaming Data

#### `createStream(source, topic)`
**Purpose:** Create AsyncIterator  
**Returns:** AsyncIterator<Message>

#### `publishToStream(streamId, data)`
**Purpose:** Emit data chunk to stream

#### `closeStream(streamId)`
**Purpose:** Signal stream end

**Usage example:**
```javascript
const stream = createStream('sensor.motion');
for await (const data of stream) {
  console.log('Motion:', data);
}
```

---

### event.js - Fire-and-forget

#### `emitEvent(topic, data)`
**Purpose:** Fire event, don't wait  
**No response expected**

#### `subscribeToEvent(topic, callback)`
**Purpose:** Register listener

---

### handshake.js - Unit Initialization

#### `initiateHandshake(unitId)`
**Purpose:** Send 'unit.init', wait for 'unit.ready'  
**Timeout:** 10s

#### `respondHandshake(unitId)`
**Purpose:** Unit emits 'unit.ready' with capabilities

#### `verifyHandshake(unitId)`
**Purpose:** Check unit is responsive  
**Returns:** boolean

---

## Developer Tool APIs

(See dev.u section above for complete developer tools API)

---

## External APIs (User-facing)

### Export/Import

#### `backup.exportAllData()`
**Purpose:** Export complete system state  
**Returns:** Promise<Blob> (JSON)  
**Trigger:** UI button or scheduled  
**Filename:** statik-backup-${timestamp}.json

#### `backup.importData(blob)`
**Purpose:** Restore from backup  
**Parameters:** blob (Blob) - Previously exported data  
**Side effects:** Overwrites current state, triggers reboot  
**Confirmation:** User must confirm overwrite

---

### Snapshot (ISO)

#### `snapshot.createSnapshot()`
**Purpose:** Create .iso snapshot  
**Returns:** Promise<Blob> (sfti.iso)  
**Includes:** Complete source tree + state + config  
**Auto-generation:** Every 30 minutes (configurable)

#### `snapshot.loadSnapshot(blob)`
**Purpose:** Restore from .iso  
**Side effects:** Complete system replacement  
**Validation:** Hash check for integrity

---

## Error Handling

All APIs follow consistent error pattern:

```javascript
try {
  await api.call();
} catch (error) {
  // Error logged to telemetry.u
  // Unit handles gracefully
  // System never crashes
}
```

**Error types:**
- `ValidationError`: Schema validation failed
- `TimeoutError`: Request timed out
- `ConstraintViolationError`: Action blocked by ec.u
- `QuotaExceededError`: Storage limit reached
- `NetworkError`: Network operation failed
- `WorkerError`: Worker unresponsive

**Error handling principles:**
- Never throw errors that crash the system
- Log all errors to telemetry.u
- Provide recovery mechanisms
- User-friendly error messages

---

## Versioning

**Current version:** 0.1.0

**Semantic versioning:**
- **Major:** Breaking API changes
- **Minor:** New features, backward compatible
- **Patch:** Bug fixes

**Compatibility guarantee:**
- APIs stable within major version
- Deprecation warnings before removal
- Migration guides for breaking changes

**Version metadata:**
- Stored in manifest.json
- Included in all snapshots
- Checked on state restoration

---

## Performance Guarantees

**Message Bus:**
- `bus.emit`: <1ms (synchronous dispatch)
- `bus.on`: <0.1ms (subscription registration)
- `bus.request`: <100ms typical (network-dependent)

**Units:**
- `pce.processInput`: <5ms
- `as.filterContext`: <2ms
- `nlp.parseIntent`: <50ms (worker-based)
- `cm.storeEpisode`: <50ms (worker-based)
- `cm.retrieveMemories`: <200ms (1000 memories, TF-IDF)
- `dbt.logDelta`: <10ms

**Storage:**
- `db.storeEpisode`: <50ms
- `db.queryEpisodes`: <100ms (indexed queries)
- `opfs.writeFile`: <20ms (small files)
- `opfs.readFile`: <30ms (small files)

**UI:**
- First paint: <500ms
- Chat message render: <16ms (60fps)
- Inspector update: <50ms

**System:**
- Boot time: <2s (cold start)
- Shutdown: <1s (graceful)
- State save: <500ms

**Note:** Performance degrades gracefully under load. hc.u throttles non-critical operations to maintain responsiveness.

---

## Security

### Principles

1. **Zero trust:** Validate all inputs
2. **Least privilege:** Units only access what they need
3. **Defense in depth:** Multiple security layers
4. **Privacy by design:** No external data leakage

### Constraints (ec.u)

**Immutable rules:**
- No blind storage writes (user must see data)
- No unknown network calls (whitelist only)
- No arbitrary code execution (except sandboxed bridge)
- No impersonation (never claim to be human)
- No capability lies (honest about limitations)

**Enforcement:** BEFORE action execution, CANNOT be bypassed

### Data Protection

**Storage:**
- All data in OPFS/IndexedDB (origin-isolated)
- Optional encryption via crypto.adapter
- User controls export/sync

**Network:**
- No external APIs (except user-approved sync)
- Local-first architecture
- Optional P2P encryption

### Code Integrity

**VFS (Self-modification):**
- Changes staged (not auto-applied)
- User must explicitly save
- Rollback always available
- Snapshots before modifications

**Service Worker:**
- Pre-cache critical assets
- Integrity checks on load
- Offline fallback

### Input Validation

**Bus messages:**
- Schema validation on all messages
- Invalid messages dropped and logged
- Never trust payload structure

**User input:**
- Sanitized before processing
- No script injection
- Constrained length (prevent DoS)

### Worker Isolation

**Web Workers:**
- No DOM access
- No direct bus access (postMessage only)
- Sandboxed execution
- Timeout enforcement

### Bridge Security

**Remote debugging:**
- Local network only (192.168.x.x)
- No authentication (assumes trusted network)
- **WARNING:** Do not expose bridge to internet
- Eval commands in restricted scope

**Recommendation:** Disable bridge in production (`?dev=false`)

---

## API Documentation Conventions

**Parameter types:**
- `string`, `number`, `boolean`, `object`, `array`, `null`, `undefined`
- `Promise<T>`: Async operation returning type T
- `T[]`: Array of type T
- `T | null`: Can be null
- `function`: Callback function

**Naming conventions:**
- Units: `*.u.js` (e.g., `pce.u`, `nlp.u`)
- Functions: camelCase (e.g., `processInput`, `storeEpisode`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_QUEUE_DEPTH`)
- Bus topics: dot.notation (e.g., `context.new`, `unit.ready`)

**Documentation format:**
```javascript
/**
 * Brief description
 * @param {type} paramName - Description
 * @returns {type} Description
 * @throws {ErrorType} Condition
 * @example
 * // Usage example
 */
```

---

## Deprecated APIs

**None yet** (v0.1.0 is initial release)

Future deprecations will be documented here with:
- Deprecated version
- Replacement API
- Removal timeline
- Migration guide

---

## See Also

- **[Units.md](../Units.md)** - Detailed unit specifications
- **[Bus_RunTime.md](../Bus_RunTime.md)** - Message bus and runtime details
- **[Adapters.md](../Adapters.md)** - Platform adapter specs
- **[Storage_VFS.md](../Storage_VFS.md)** - Storage and VFS implementation
- **[BOOT.md](BOOT.md)** - Boot sequence documentation
- **[MESSAGES.md](MESSAGES.md)** - Message flow and learning
- **[STORAGE.md](STORAGE.md)** - Storage architecture
- **[IOS.md](IOS.md)** - iOS-specific features

---

**End of API Reference**