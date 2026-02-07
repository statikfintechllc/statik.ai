## SRC/UNITS DIRECTORY (Core Units)

### **src/units/pce.u.js**
**Purpose:** Perception & Context Encoder - processes all inputs into ContextFrames  
**Talks To:** bus.u (emits to 'context.new'), as.u (receives filtered), ui.u (receives input events), adapters/ios/hardware  
**Functions:**
- `async init()`:
  - Subscribe to input events: 'ui.input', 'sensor.data', 'network.response'
  - Initialize tokenizer
  - Load novelty cache from memory
- `processInput(rawInput)`:
  - Tokenize text (split words, punctuation)
  - Extract n-grams (2-3 word phrases)
  - Tag intent hints (regex patterns: question, command, statement)
  - Calculate novelty score (compare to recent inputs)
  - Generate unique ID
  - Create ContextFrame object
  - Emit to bus: 'context.new'
- `calculateNovelty(input)`:
  - Hash input
  - Check if seen in last N inputs (sliding window)
  - Return score: 1.0 = never seen, 0.0 = exact duplicate
- `tokenize(text)`: Simple whitespace + punctuation split
**State:**
- `recentInputs`: Last 100 input hashes (for novelty)
- `contextCount`: Total contexts processed
**Key Behaviors:**
- Fast processing (<5ms per input)
- No blocking operations
- Novelty detection prevents processing spam

---

### **src/units/as.u.js**
**Purpose:** Attention & Salience - filters which contexts deserve processing  
**Talks To:** bus.u (subscribes 'context.new', emits 'context.salient'), ti.u, gm.u  
**Functions:**
- `async init()`:
  - Subscribe to 'context.new'
  - Load attention thresholds from config
- `filterContext(context)`:
  - Score context on multiple dimensions:
    - Novelty (from pce.u): weight 0.3
    - Urgency (user-initiated = high): weight 0.4
    - Goal alignment (helps current goal?): weight 0.2
    - Resource cost (processing budget): weight 0.1
  - Threshold: score > 0.5 → salient
  - Emit salient contexts to 'context.salient'
- `calculateSalience(context)`:
  - Weighted sum of scores
  - Normalize to 0-1 range
- `deduplicateContexts(contexts)`:
  - Hash-based deduplication
  - Keep highest salience if duplicates
**State:**
- `processedCount`: Total contexts evaluated
- `salientCount`: Contexts marked salient
- `droppedCount`: Low-salience contexts ignored
**Key Behaviors:**
- Prevents processing flood (spam protection)
- Adaptive thresholds (if queue backing up, raise threshold)
- Logs dropped contexts for telemetry

---

### **src/units/ti.u.js**
**Purpose:** Temporal Integrator - builds continuity over time  
**Talks To:** bus.u (subscribes 'context.salient', emits 'context.temporal'), cm.u, gm.u  
**Functions:**
- `async init()`:
  - Subscribe to 'context.salient'
  - Initialize timeline array
  - Load session boundaries from storage
- `addToTimeline(context)`:
  - Append to timeline with sequence number
  - Link to previous context (causal chain)
  - Detect session boundary (idle >10min = new session)
  - Add temporal metadata:
    - `sequenceNum`: Position in timeline
    - `sessionId`: Current session identifier
    - `prevContext`: Link to previous context
    - `timeSinceLast`: Milliseconds since last context
  - Emit to 'context.temporal'
- `buildCausalChain(context)`:
  - Look back in timeline for related contexts
  - Link if: same topic, <5min apart, same session
  - Return chain: [ctx1 → ctx2 → ctx3 → current]
- `getSlidingWindow(windowSize='10')`:
  - Return last N contexts (for immediate context)
- `detectSessionBoundary()`:
  - Check time since last context
  - If >10min idle → mark new session
**State:**
- `timeline`: Array of all contexts (bounded to last 1000)
- `currentSession`: Active session ID
- `sessionCount`: Total sessions this boot
**Key Behaviors:**
- Enables "you said X earlier" references
- Session detection for context reset
- Causal chains for reasoning

---

### **src/units/gm.u.js**
**Purpose:** Goals & Motivation - generates autonomous goals  
**Talks To:** bus.u (subscribes 'context.temporal', 'system.event', emits 'goal.new'), ie.u (receives goal execution results), cm.u, sa.u  
**Functions:**
- `async init()`:
  - Subscribe to contexts, system events
  - Initialize goal queue (priority heap)
  - Load autonomy level from config (low/med/high)
- `async generateGoals(context)`:
  - Detect user intent → create reactive goal
  - Check system health → create homeostatic goals
  - Randomly explore → create exploratory goals (if autonomy high)
  - Emit new goals to 'goal.new'
- `createReactiveGoal(context)`:
  - Example: user asks question → goal: "answer question"
  - Priority: 10 (high)
  - Deadline: now + 5s
- `createHomeostaticGoal()`:
  - Check memory usage → goal: "prune old memories"
  - Priority: 3 (low)
  - Deadline: now + 1h
- `createExploratoryGoal()`:
  - Goal: "try new greeting pattern"
  - Priority: 1 (very low)
  - No deadline
- `prioritizeGoals()`:
  - Sort by priority, then deadline
  - Return top goal for execution
- `updateGoalQueue(goalResult)`:
  - Mark goal complete/failed
  - Adjust priorities based on success
**State:**
- `goalQueue`: Priority queue of pending goals
- `activeGoal`: Currently executing goal
- `completedGoals`: History (last 100)
- `autonomyLevel`: 'low' | 'medium' | 'high'
**Key Behaviors:**
- If autonomy=low: only reactive goals
- If autonomy=high: generates background goals proactively
- Never blocks (goals queued, executed async)

---

### **src/units/nlp.u.js**
**Purpose:** Natural Language Processor - parse and compose language  
**Talks To:** bus.u (subscribes 'intent.parse', 'response.compose', emits 'intent.parsed', 'response.text'), workers/nlp.worker.js  
**Functions:**
- `async init()`:
  - Subscribe to parse/compose requests
  - Load pattern library (intents, templates)
  - Spawn nlp.worker.js for heavy processing
- **PARSING:**
  - `async parseIntent(text)`:
    - Offload to worker: tokenize, POS tag, extract entities
    - Match against intent patterns (regex/rules)
    - Return: `{intent: 'query.balance', entities: [], confidence: 0.8}`
  - `matchPattern(tokens, patterns)`:
    - Pattern examples:
      - "what * my balance" → intent: query.balance
      - "transfer $X to Y" → intent: command.transfer
    - Return best matching pattern + confidence
- **COMPOSING:**
  - `async composeResponse(intent, slots)`:
    - Select template based on intent
    - Fill slots with variables
    - Apply grammar rules (basic)
    - Return generated text
  - Example:
    - Intent: respond.balance, Slots: {amount: 1234.56}
    - Template: "Your balance is ${amount}"
    - Output: "Your balance is $1,234.56"
**State:**
- `patternLibrary`: Intent patterns loaded from storage
- `templateLibrary`: Response templates
- `confidence_threshold`: 0.6 (below = unknown intent)
**Key Behaviors:**
- Worker offloading (don't block main thread)
- Pattern matching (not ML, just rules)
- Template-based generation (not generative)
- Unknown intents → fallback: "I don't understand"

---

### **src/units/cm.u.js**
**Purpose:** Core Memory - episodic, semantic, procedural storage  
**Talks To:** bus.u (subscribes 'memory.store', 'memory.retrieve', emits 'memory.result'), workers/memory.worker.js, storage/db.js  
**Functions:**
- `async init()`:
  - Open IndexedDB (statik_memory)
  - Spawn memory.worker.js
  - Load memory index (for fast retrieval)
- **STORAGE:**
  - `async storeEpisode(context)`:
    - Save to episodes table
    - Extract key phrases for indexing
    - Update memory index
  - `async storeConcept(name, definition, relations)`:
    - Save to concepts table
    - Link to related concepts
  - `async storeSkill(name, procedure, success_rate)`:
    - Save to skills table
- **RETRIEVAL:**
  - `async retrieveMemories(query, limit=10)`:
    - Score memories on:
      - Recency (recent = higher score)
      - Frequency (repeated patterns)
      - Salience (high attention events)
      - Similarity (TF-IDF cosine similarity)
    - Return top N matches
  - `calculateSimilarity(query, memory)`:
    - TF-IDF vectors
    - Cosine similarity
    - No embeddings (just word frequency)
- **CONSOLIDATION:**
  - `async consolidateMemories()`:
    - Merge similar episodes
    - Strengthen frequently accessed memories
    - Prune low-salience old memories
    - Run in background (triggered by hc.u)
**State:**
- `memoryIndex`: In-memory index (Map of keywords → memory IDs)
- `accessCounts`: Frequency tracking
**Key Behaviors:**
- Worker-based DB ops (async, non-blocking)
- Similarity without embeddings (TF-IDF sufficient)
- Automatic consolidation (background task)

---

### **src/units/dbt.u.js**
**Purpose:** Delta & Learning Ledger - tracks changes, enables learning  
**Talks To:** bus.u (subscribes 'pattern.result', 'skill.result', 'action.outcome'), storage/db.js (statik_logs), nlp.u, cm.u, ee.u  
**Functions:**
- `async init()`:
  - Open IndexedDB (statik_logs database, deltas table)
  - Subscribe to: 'pattern.result', 'skill.result', 'action.outcome'
  - Load recent deltas into memory cache
- **DELTA LOGGING:**
  - `logDelta(deltaType, before, after, evidence, reason)`:
    - Create delta entry with structure:
    ```js
    {
      id: generateId(),
      timestamp: Date.now(),
      delta_type: 'pattern.confidence' | 'skill.success_rate' | 'concept.relation',
      target_id: 'pattern_greeting_casual',
      before: 0.65,
      after: 0.72,
      change: +0.07,
      evidence: 'ctx_abc123',
      reason: 'user responded positively'
    }
    ```
  - Append to IndexedDB deltas table (append-only)
  - Emit 'delta.logged' event
- **PATTERN LEARNING:**
  - `updatePatternConfidence(patternId, outcome)`:
    - Retrieve current confidence from nlp.u
    - If outcome = 'success': 
      - newConfidence = Math.min(1.0, currentConfidence + 0.05)
    - If outcome = 'failure':
      - newConfidence = Math.max(0.0, currentConfidence - 0.10)
    - Log delta
    - Send update to nlp.u: 'pattern.update'
- **SKILL LEARNING:**
  - `updateSkillSuccessRate(skillId, outcome)`:
    - Running average calculation
    - successRate = (oldRate * attempts + outcome) / (attempts + 1)
    - Log delta
    - Send update to cm.u: 'skill.update'
- **CONCEPT LEARNING:**
  - `updateConceptRelation(conceptId, relatedId, strength)`:
    - Strengthen/weaken concept relationships
    - Used when concepts frequently appear together
    - Log delta
- **MAINTENANCE:**
  - `pruneDeadPatterns()`:
    - Query patterns where confidence < 0.2 for >30 days
    - Mark for deletion
    - Emit 'pattern.prune' → nlp.u removes from active set
  - `promoteStrongPatterns()`:
    - Query patterns where confidence > 0.85 for >7 days
    - Mark as "high_confidence"
    - Emit 'pattern.promote' → nlp.u uses preferentially
  - `getDeltaHistory(targetId, limit=100)`:
    - Retrieve delta history for specific pattern/skill/concept
    - Used by dev.u for debugging
**State:**
- `deltaCache`: Last 1000 deltas in memory (performance)
- `patternStats`: Map<patternId, {confidence, lastUpdate, attempts}>
- `skillStats`: Map<skillId, {successRate, attempts, lastUsed}>
**Key Behaviors:**
- ALL learning flows through dbt.u (single source of truth)
- Deltas are immutable (append-only log for audit)
- Confidence adjustments are asymmetric (faster to lose confidence)
- Background cleanup runs every 24 hours (prune/promote)
- Learning is gradual (no sudden changes)

---

### **src/units/ee.u.js**
**Purpose:** Evaluation & Error - detects when predictions fail  
**Talks To:** bus.u (subscribes 'action.executed', 'prediction.made', emits 'error.detected', 'success.confirmed'), dbt.u, gm.u, ie.u  
**Functions:**
- `async init()`:
  - Subscribe to action results
  - Initialize prediction tracker
  - Load error thresholds from config
- **PREDICTION TRACKING:**
  - `recordPrediction(actionId, predicted_outcome)`:
    - Store prediction with timestamp
    - Wait for actual outcome
    - Map: actionId → {predicted, timestamp, resolved: false}
  - `recordOutcome(actionId, actual_outcome)`:
    - Retrieve prediction
    - Compare predicted vs actual
    - Emit result to dbt.u and gm.u
- **ERROR DETECTION:**
  - `evaluateAction(actionId, prediction, outcome)`:
    - Calculate error:
    ```js
    {
      match: prediction === outcome,
      error_type: determineErrorType(prediction, outcome),
      severity: calculateSeverity(prediction, outcome),
      context: getActionContext(actionId)
    }
    ```
  - If mismatch → emit 'error.detected'
  - If match → emit 'success.confirmed'
- **ERROR TYPES:**
  - `determineErrorType(predicted, actual)`:
    - 'prediction_mismatch': Expected X, got Y
    - 'action_failure': Action didn't execute
    - 'constraint_violation': Broke ec.u rule
    - 'timeout': Action took too long
    - 'unexpected_state': System in wrong state
- **SEVERITY CALCULATION:**
  - `calculateSeverity(error)`:
    - Critical (9-10): System crash, data loss
    - High (7-8): Feature broken, constraint violated
    - Medium (4-6): Incorrect response, slow performance
    - Low (1-3): Minor UI glitch, cosmetic issue
- **FEEDBACK LOOP:**
  - `triggerCorrection(error)`:
    - If severity >= 7: Emit 'goal.corrective' to gm.u
    - If pattern-related: Send delta to dbt.u (decrease confidence)
    - If skill-related: Send failure to dbt.u
    - Log to telemetry.u
- **ERROR RECOVERY:**
  - `suggestRecovery(error)`:
    - Based on error type, suggest corrective action
    - Example: prediction_mismatch → "retry with different pattern"
    - Return recovery goal to gm.u
**State:**
- `predictions`: Map<actionId, {predicted, timestamp}>
- `errorHistory`: Last 1000 errors
- `successRate`: Running average of prediction accuracy
**Key Behaviors:**
- Every action gets evaluated (no silent failures)
- Errors feed back to learning (dbt.u)
- Critical errors trigger immediate correction goals
- Success reinforces patterns (positive feedback)

---

### **src/units/sa.u.js**
**Purpose:** Self Model & Awareness - knows what system can/can't do  
**Talks To:** bus.u (subscribes 'capability.query', emits 'capability.response'), all units (queries their capabilities), configs/capabilities.json  
**Functions:**
- `async init()`:
  - Load capabilities.json
  - Query each unit for self-reported capabilities
  - Build capability registry
  - Subscribe to capability queries
- **CAPABILITY TRACKING:**
  - `registerCapability(category, capability, available)`:
    ```js
    {
      category: 'language' | 'vision' | 'audio' | 'network' | 'storage',
      capability: 'parse_text' | 'understand_images' | 'access_microphone',
      available: true | false,
      limitations: "Can parse English only, max 10k chars",
      unit_id: 'nlp.u'
    }
    ```
  - Store in capability registry
- `queryCapability(capability)`:
  - Check if system can do X
  - Return: {available, limitations, confidence}
  - Used by ie.u before attempting actions
- **LIMITATION AWARENESS:**
  - `getSystemLimitations()`:
    - Return list of known limitations:
    ```js
    [
      "Cannot access network (CORS)",
      "Cannot see images (no vision model)",
      "English language only",
      "Max memory: 100MB",
      "Runs client-side only"
    ]
    ```
  - Used by nlp.u for honest refusals
- **CONFIDENCE TRACKING:**
  - `trackConfidence(domain, confidence)`:
    - Store confidence per capability
    - Examples:
      - "Intent classification: 82%"
      - "Pattern matching: 76%"
      - "Goal completion: 91%"
  - Updated by ee.u based on outcomes
- **STATE AWARENESS:**
  - `getCurrentState()`:
    - Return system status:
    ```js
    {
      mode: 'normal' | 'safe' | 'degraded',
      uptime: 1234567,
      memory_used: 45,
      active_units: 15,
      current_goal: 'respond.query',
      processing: true
    }
    ```
  - Used by ui.u for status display
- **HONESTY ENFORCEMENT:**
  - `canDo(action)`:
    - Check capability registry
    - If not available → return false
    - Used by ie.u and nlp.u to avoid hallucinations
  - Example:
    - User: "Show me a picture of a cat"
    - sa.u.canDo('generate_image') → false
    - Response: "I can't generate images. I'm client-side only."
**State:**
- `capabilityRegistry`: Map<capability, metadata>
- `confidenceScores`: Map<domain, score>
- `systemState`: Current runtime state
**Key Behaviors:**
- Self-aware of limitations (no false promises)
- Provides honest refusals (not hallucinations)
- Tracks performance confidence
- Updates as capabilities change (new units, features)

---

### **src/units/ie.u.js**
**Purpose:** Intent Execution - turns goals into actions  
**Talks To:** bus.u (subscribes 'goal.execute', emits 'action.executed'), sa.u (checks capabilities), ec.u (validates actions), ui.u, storage/db.js, adapters/*  
**Functions:**
- `async init()`:
  - Subscribe to 'goal.execute'
  - Load action definitions
  - Initialize execution queue
- **ACTION EXECUTION:**
  - `async executeGoal(goal)`:
    - 1. Validate with sa.u (can system do this?)
    - 2. Check ec.u (is this allowed?)
    - 3. Predict outcome (for ee.u)
    - 4. Execute action
    - 5. Observe outcome
    - 6. Report to ee.u
- **ACTION TYPES:**
  - `ui.update`:
    - `updateUI(element, content)`:
      - Emit to ui.u: 'ui.render'
      - Pass: {element: '#chat', content: "Hello"}
  - `storage.write`:
    - `writeStorage(store, data)`:
      - Validate data against schema
      - Call storage/db.js
      - Emit: 'storage.written'
  - `network.call`:
    - `makeNetworkCall(url, method, body)`:
      - Check network availability
      - Fetch with timeout
      - Emit result: 'network.response'
  - `eval.code`:
    - `evaluateCode(code)`:
      - Sandboxed eval (limited scope)
      - Used by bridge.u for remote commands
      - Return result
- **PREDICTION:**
  - `predictOutcome(action)`:
    - Based on action type and past results
    - Example: "ui.update likely succeeds (95%)"
    - Sent to ee.u for comparison
- **ERROR HANDLING:**
  - `handleActionError(error, action)`:
    - Catch execution errors
    - Report to ee.u as action failure
    - Optionally retry (if transient error)
    - Never throw (log and continue)
- **ROLLBACK:**
  - `rollbackAction(actionId)`:
    - For failed transactions
    - Example: partial storage write → delete incomplete data
    - Emit: 'action.rolled_back'
**State:**
- `executionQueue`: Pending actions (FIFO)
- `activeAction`: Currently executing
- `actionHistory`: Last 1000 actions with outcomes
**Key Behaviors:**
- ALL actions go through ie.u (single execution point)
- Capability check before execution (no blind attempts)
- Constraint validation (ec.u approval required)
- Transactional (rollback on failure)
- Predictive (enables error detection)

---

### **src/units/ec.u.js**
**Purpose:** Constraints & Ethics - hard boundaries on behavior  
**Talks To:** bus.u (subscribes 'action.validate', emits 'action.allowed' | 'action.denied'), ie.u  
**Functions:**
- `async init()`:
  - Load constraint rules from config
  - Subscribe to validation requests
  - Initialize violation log
- **CONSTRAINT RULES (IMMUTABLE):**
  ```js
  const HARD_RULES = [
    {
      id: 'no_blind_storage',
      rule: 'Never write to storage without user seeing what is written',
      check: (action) => {
        if (action.type === 'storage.write') {
          return action.userVisible === true;
        }
        return true;
      }
    },
    {
      id: 'no_unknown_network',
      rule: 'Never make network calls to unknown domains',
      check: (action) => {
        if (action.type === 'network.call') {
          return KNOWN_DOMAINS.includes(action.domain);
        }
        return true;
      }
    },
    {
      id: 'no_arbitrary_code',
      rule: 'Never execute code from external sources',
      check: (action) => {
        if (action.type === 'eval.code') {
          return action.source === 'internal' || action.source === 'bridge';
        }
        return true;
      }
    },
    {
      id: 'no_impersonation',
      rule: 'Never pretend to be human',
      check: (action) => {
        if (action.type === 'ui.update' && action.content) {
          return !IMPERSONATION_PATTERNS.test(action.content);
        }
        return true;
      }
    },
    {
      id: 'no_capability_lies',
      rule: 'Never lie about capabilities',
      check: (action) => {
        if (action.type === 'respond') {
          // Check with sa.u if claiming false capability
          return true; // Delegated to sa.u + nlp.u
        }
        return true;
      }
    }
  ];
  ```
- **VALIDATION:**
  - `validateAction(action)`:
    - Run action through all HARD_RULES
    - If any rule returns false → DENY
    - If all pass → ALLOW
    - Return: {allowed: true/false, violatedRule: null | ruleId}
  - `checkRule(rule, action)`:
    - Execute rule's check function
    - Catch errors (treat as violation)
    - Log result
- **ENFORCEMENT:**
  - `enforceConstraint(action, violation)`:
    - If violation detected:
      - Emit 'action.denied' to ie.u
      - Log violation to telemetry.u
      - Optionally alert user (if critical)
    - Action is BLOCKED (never executed)
- **VIOLATION LOGGING:**
  - `logViolation(action, rule)`:
    ```js
    {
      timestamp: Date.now(),
      action: action,
      violated_rule: rule.id,
      severity: 'critical',
      blocked: true
    }
    ```
  - Permanent log (audit trail)
- **NO OVERRIDE:**
  - `canOverride()`: Always returns false
  - Even dev.u cannot bypass constraints
  - Only way to change: modify ec.u code directly (requires user)
**State:**
- `HARD_RULES`: Immutable constraint set
- `violationLog`: All blocked actions (append-only)
**Key Behaviors:**
- Zero tolerance (one violation = action blocked)
- Cannot be disabled (even in dev mode)
- Violations logged permanently
- No exceptions, no overrides
- Constraint enforcement happens BEFORE execution

---

### **src/units/hc.u.js**
**Purpose:** Homeostasis - maintains system stability  
**Talks To:** bus.u (subscribes 'system.event', emits 'homeostasis.action'), runtime/quota.js, runtime/allocator.js, cm.u, dbt.u, gm.u  
**Functions:**
- `async init()`:
  - Load thresholds from constraints.json
  - Start monitoring loop (every 10s)
  - Subscribe to resource events
- **MONITORING:**
  - `async monitorHealth()`:
    - Check:
      - Memory usage (IndexedDB + heap)
      - CPU usage (via allocator.js)
      - Goal queue depth
      - Message bus throughput
      - Worker health
    - If any metric exceeds threshold → take action
- **MEMORY MANAGEMENT:**
  - `checkMemoryUsage()`:
    - Query quota.js for storage usage
    - If >90%: Emit 'goal.cleanup' to gm.u
    - If >95%: Trigger emergency prune (cm.u)
    - If >98%: Pause learning (dbt.u)
  - `pruneMemories()`:
    - Request cm.u to delete low-salience old memories
    - Target: free 20% of used space
    - Priority: oldest, least accessed, lowest salience
- **CPU THROTTLING:**
  - `checkCPUUsage()`:
    - Query allocator.js for CPU%
    - If >80%: Emit 'throttle.low_priority' to scheduler
    - If >90%: Pause background tasks
    - If >95%: Emergency: pause all non-critical units
- **QUEUE MANAGEMENT:**
  - `checkQueueDepth()`:
    - Query bus.u for queue depth
    - If >500: Start dropping low-priority messages
    - If >1000: Aggressive throttling
    - If >2000: Pause message processing, alert user
- **WORKER HEALTH:**
  - `checkWorkers()`:
    - Ping each worker
    - If unresponsive >5s: Restart worker
    - If restart fails 3x: Disable features requiring that worker
- **LEARNING CONTROL:**
  - `pauseLearning()`:
    - Emit 'learning.pause' to dbt.u
    - Stop pattern updates
    - Resume when resources available
  - `resumeLearning()`:
    - Emit 'learning.resume' to dbt.u
- **EMERGENCY ACTIONS:**
  - `emergencyShutdown()`:
    - If system critically unstable:
      - Save state
      - Stop all units
      - Enter safe mode
      - Alert user
**State:**
- `healthMetrics`: Current resource usage
- `thresholds`: Loaded from constraints.json
- `actionHistory`: Recent homeostatic actions
**Key Behaviors:**
- Runs continuously (background monitor)
- Preventive (acts before critical limits)
- Gradual response (throttle → pause → emergency)
- Self-preservation (prevents crashes)
- Transparent (logs all actions to telemetry)

---

## SRC/UNITS DIRECTORY

### **src/units/sync.u.js**
**Purpose:** Sync & Federation - share state between instances  
**Talks To:** bus.u (subscribes 'sync.request', emits 'sync.complete'), cm.u, dbt.u, disc.u, mesh.u, storage/backup.js  
**Functions:**
- `async init()`:
  - Check if sync enabled (user preference)
  - Initialize sync state tracker
  - Subscribe to sync events
  - Connect to discovered instances (via disc.u)
- **SYNC MECHANISMS:**
  - `async syncMemories(targetInstance)`:
    - Export memories from cm.u
    - Filter: only user-approved memories
    - Send via mesh.u (P2P)
    - Merge incoming memories (conflict resolution)
  - `async syncPatterns(targetInstance)`:
    - Export pattern confidence scores from dbt.u
    - Send learned patterns
    - Merge: take higher confidence on conflict
  - `async syncGoals(targetInstance)`:
    - Share pending goals (optional)
    - Distribute compute: one instance delegates to another
- **CONFLICT RESOLUTION:**
  - `resolveConflict(local, remote, type)`:
    - For memories: keep both (tag with instance_id)
    - For patterns: weighted average of confidence
    - For goals: priority wins
    - For state: last-write-wins (timestamp)
- **EXPORT/IMPORT:**
  - `exportState(selective=false)`:
    - Generate JSON snapshot:
    ```js
    {
      instance_id: 'statik_phone_abc',
      timestamp: Date.now(),
      memories: [...],
      patterns: {...},
      skills: [...],
      metadata: {...}
    }
    ```
    - If selective: only user-chosen data
    - Return blob for download or P2P send
  - `async importState(snapshot, merge=true)`:
    - Validate snapshot structure
    - If merge: combine with existing state
    - If replace: overwrite (after confirmation)
    - Emit 'sync.imported'
- **SELECTIVE SYNC:**
  - `configureSyncPolicy(policy)`:
    ```js
    {
      sync_memories: true,
      sync_patterns: true,
      sync_skills: false,
      auto_sync: false, // Manual trigger only
      trusted_instances: ['statik_laptop_xyz']
    }
    ```
- **SYNC STATUS:**
  - `getSyncStatus()`:
    - Return: last sync time, pending changes, conflicts
    - Used by ui.u for sync indicator
**State:**
- `syncPolicy`: User preferences
- `lastSync`: Map<instance_id, timestamp>
- `pendingChanges`: Changes not yet synced
- `conflicts`: Unresolved merge conflicts
**Key Behaviors:**
- Always opt-in (never auto-sync without permission)
- Privacy-first (user controls what syncs)
- Offline-capable (queue changes, sync when connected)
- Bidirectional (both instances update each other)

---

### **src/units/ui.u.js**
**Purpose:** User Interface - manages DOM and user interaction  
**Talks To:** bus.u (subscribes 'ui.render', 'ui.update', emits 'ui.input', 'ui.click'), pce.u (sends input), shell.js, chat.js, inspector/*  
**Functions:**
- `async init()`:
  - Mount UI components to DOM
  - Initialize event listeners
  - Load UI state from storage
  - Subscribe to render/update events
- **COMPONENT RENDERING:**
  - `renderShell()`:
    - Create main UI shell
    - Components: chat window, inspector panel, controls
    - Call shell.js for layout
  - `renderChat()`:
    - Initialize chat interface via chat.js
    - Text input, message history, send button
  - `renderInspector()`:
    - Load inspector panels (memory, goals, trace, performance)
    - Collapsible sidebar
  - `renderControls()`:
    - Pause/Resume, Reset, Export buttons
    - System status indicator
- **INPUT HANDLING:**
  - `handleUserInput(text)`:
    - Capture from text input or voice (future)
    - Emit to bus: 'ui.input' → pce.u
    - Clear input field
    - Show typing indicator
  - `handleClick(element)`:
    - Capture button/link clicks
    - Emit to bus: 'ui.click' → ie.u
  - `handleScroll(position)`:
    - Track scroll events (for context)
    - Emit to pce.u if relevant
- **OUTPUT RENDERING:**
  - `displayMessage(message)`:
    - Append to chat history
    - Format: user vs system styling
    - Auto-scroll to bottom
    - Syntax highlighting for code
  - `updateStatus(status)`:
    - Update system status indicator
    - Show: current goal, processing state, errors
    - Color: green=ready, yellow=processing, red=error
  - `showNotification(notification)`:
    - Toast/banner for important events
    - Auto-dismiss after timeout
- **INSPECTOR UPDATES:**
  - `updateMemoryView(memories)`:
    - Refresh memory inspector
    - Show: recent memories, search results
  - `updateGoalView(goals)`:
    - Show goal queue, active goal
    - Progress indicators
  - `updateTraceView(messages)`:
    - Real-time message flow visualization
    - Filter by unit, topic
  - `updatePerformanceView(metrics)`:
    - CPU, memory, throughput graphs
    - Use chart library (or canvas)
- **STATE MANAGEMENT:**
  - `saveUIState()`:
    - Remember: window size, panel visibility, theme
    - Store in localStorage
  - `restoreUIState()`:
    - Load saved preferences on boot
**State:**
- `components`: Map of mounted components
- `eventListeners`: Registered DOM listeners
- `chatHistory`: Message log for display
**Key Behaviors:**
- Reactive (updates on bus events)
- Non-blocking (render in requestAnimationFrame)
- Accessible (keyboard navigation, ARIA labels)
- Responsive (mobile-first design)

---

### **src/units/telemetry.u.js**
**Purpose:** Observability - metrics, logs, traces  
**Talks To:** bus.u (subscribes '*' all events), storage/db.js (statik_logs), ui.u (for display)  
**Functions:**
- `async init()`:
  - Subscribe to all bus events (wildcard)
  - Initialize metric collectors
  - Open logs database
  - Start aggregation loop (every 10s)
- **METRIC COLLECTION:**
  - `recordMetric(category, metric, value)`:
    - Categories: 'performance', 'usage', 'errors'
    - Examples:
      - recordMetric('performance', 'message_latency_ms', 15)
      - recordMetric('usage', 'units_active', 14)
      - recordMetric('errors', 'validation_failures', 1)
    - Store in time-series buffer
  - `aggregateMetrics()`:
    - Every 10s: compute averages, percentiles
    - Store aggregated data (reduce storage)
- **LOG COLLECTION:**
  - `logEvent(level, unit, message, context)`:
    - Levels: 'debug', 'info', 'warn', 'error', 'critical'
    - Structure:
    ```js
    {
      timestamp: Date.now(),
      level: 'info',
      unit: 'nlp.u',
      message: 'Parsed intent: query.balance',
      context: {intent: '...', confidence: 0.82}
    }
    ```
    - Store in IndexedDB (logs table)
    - If level >= 'error': emit alert to ui.u
- **MESSAGE TRACING:**
  - `traceMessage(message)`:
    - Record message flow through bus
    - Track: source, target, latency, outcome
    - Build trace chains for debugging
  - `getMessageTrace(messageId)`:
    - Return complete path: pce.u → as.u → ti.u → gm.u
- **PERFORMANCE TRACKING:**
  - `startTimer(operation)`:
    - Create timer for operation
    - Return timer ID
  - `endTimer(timerId)`:
    - Calculate elapsed time
    - Record metric: `${operation}_duration_ms`
  - Example:
    ```js
    const t = telemetry.startTimer('nlp.parse');
    await nlp.parse(text);
    telemetry.endTimer(t); // Records: nlp.parse_duration_ms
    ```
- **ERROR TRACKING:**
  - `recordError(error, context)`:
    - Capture error details: message, stack, unit
    - Associate with context (what was happening)
    - Aggregate error rates
    - Alert if error rate spikes
- **DASHBOARD DATA:**
  - `getDashboardMetrics()`:
    - Return summary for ui.u inspector:
    ```js
    {
      message_throughput: 45, // msgs/sec
      avg_latency: 12, // ms
      memory_usage: 67, // MB
      cpu_usage: 23, // %
      error_rate: 0.02, // %
      units_active: 15
    }
    ```
- **EXPORT:**
  - `exportLogs(filter)`:
    - Export logs for debugging
    - Filter by: time range, level, unit
    - Return JSON or CSV
**State:**
- `metrics`: Time-series data (last 24 hours)
- `logs`: Rotating buffer (last 10,000 entries)
- `traces`: Message flow history
**Key Behaviors:**
- Local only (no external telemetry)
- Minimal overhead (<1% CPU)
- Automatic rotation (old data pruned)
- Privacy-preserving (user can export/delete)

---

### **src/units/dev.u.js**
**Purpose:** Developer Tools - debugging, testing, inspection  
**Talks To:** bus.u (all events), telemetry.u, kernel.u, all units  
**Functions:**
- `async init()`:
  - Check if dev mode enabled (?dev=true in URL)
  - If yes: initialize dev tools
  - If no: remain dormant
  - Subscribe to dev commands
- **SIMULATION MODE:**
  - `simulateInput(input)`:
    - Inject fake user input
    - Test system without typing
    - Batch testing: simulate 100 inputs
  - `simulateEvent(event)`:
    - Trigger any bus event manually
    - Test unit responses
- **TIME TRAVEL:**
  - `replayMessages(startTime, endTime)`:
    - Fetch message history from telemetry
    - Replay through bus at 10x speed
    - See how system responds to past events
  - `stepThrough(messageId)`:
    - Step through message flow one hop at a time
    - Inspect state at each step
- **UNIT ISOLATION:**
  - `isolateUnit(unitId)`:
    - Disable all other units
    - Test single unit in isolation
    - Mock inputs from other units
  - `mockUnit(unitId, behavior)`:
    - Replace real unit with mock
    - Define custom responses
    - Test error conditions
- **CHAOS TESTING:**
  - `injectErrors(rate=0.1)`:
    - Randomly drop messages (10% rate)
    - Simulate network failures
    - Test error recovery
  - `crashUnit(unitId)`:
    - Force unit to crash
    - Test watchdog recovery
  - `overloadSystem()`:
    - Flood message bus
    - Test backpressure, throttling
- **STATE INSPECTION:**
  - `inspectUnitState(unitId)`:
    - Return complete unit state
    - Deep clone (non-reactive)
  - `compareStates(snapshot1, snapshot2)`:
    - Diff two state snapshots
    - Show what changed
- **BREAKPOINTS:**
  - `setBreakpoint(unitId, event)`:
    - Pause execution when unit receives event
    - Inspect state, step through
  - `resume()`: Continue after breakpoint
- **PERFORMANCE PROFILING:**
  - `startProfiling()`:
    - Record all unit execution times
    - Track memory allocations
  - `stopProfiling()`:
    - Generate flame graph
    - Show bottlenecks
- **ASSERTIONS:**
  - `assert(condition, message)`:
    - Test system behavior
    - If condition false: log failure
    - Accumulate assertions for test suite
**State:**
- `devMode`: Boolean (enabled/disabled)
- `isolatedUnit`: Currently isolated unit
- `breakpoints`: Active breakpoints
- `profilingData`: Performance traces
**Key Behaviors:**
- Only active if explicitly enabled
- Does not affect production behavior
- All actions logged to telemetry
- Can be disabled even in dev mode

---

### **src/units/bridge.u.js**
**Purpose:** Debug Bridge - remote control from Python server  
**Talks To:** bus.u (all events), Python debug server (Surface Go 3), telemetry.u  
**Functions:**
- `async init()`:
  - Detect debug server on network
  - If found: connect and start polling
  - If not: remain dormant
  - Subscribe to all bus events (for logging)
- **SERVER DETECTION:**
  - `async detectDebugServer()`:
    - Try current URL origin first
    - If localhost: try 192.168.1.x range (common router IPs)
    - Ping /debug/ping endpoint
    - If responds: set debugServer URL
- **POLLING LOOP:**
  - `startPolling()`:
    - Poll /cmd endpoint every 2 seconds
    - Execute received commands
    - Report results to /response
  - `async pollForCommands()`:
    ```js
    const cmd = await fetch(`${debugServer}/cmd`);
    if (cmd.cmd !== 'noop') {
      const result = await executeCommand(cmd);
      await sendResponse(cmd.id, result);
    }
    ```
- **COMMAND EXECUTION:**
  - `async executeCommand(cmd)`:
    - Command types:
      - `reload`: window.location.reload()
      - `screenshot`: await takeScreenshot()
      - `eval`: eval(cmd.code) in safe scope
      - `getState`: return kernel.getStatus()
      - `click`: document.querySelector(cmd.selector).click()
      - `type`: fill input field
      - `scroll`: window.scrollTo(...)
      - `test`: run specific test
    - Return result or error
- **SCREENSHOT CAPTURE:**
  - `async takeScreenshot()`:
    - Use html2canvas library
    - Capture entire viewport
    - Convert to base64
    - Return data URL
  - Optional: crop to specific element
- **LOG STREAMING:**
  - `interceptConsole()`:
    - Override console.log, console.error, etc.
    - Send all logs to /debug/log endpoint
    - Original console still works (pass-through)
  - `streamBusMessages()`:
    - Send all bus messages to /debug/message
    - Filter: only important events (configurable)
- **STATE REPORTING:**
  - `async sendStateSnapshot()`:
    - Every 1 second (or on-demand)
    - Gather unit states from kernel
    - POST to /debug/state
- **PERFORMANCE REPORTING:**
  - `async sendPerformanceMetrics()`:
    - Every 5 seconds
    - Get metrics from telemetry.u
    - POST to /debug/performance
- **RESPONSE HANDLING:**
  - `async sendResponse(cmdId, result)`:
    ```js
    await fetch(`${debugServer}/response`, {
      method: 'POST',
      body: JSON.stringify({
        id: cmdId,
        result: result,
        timestamp: Date.now(),
        success: true
      })
    });
    ```
- **ERROR REPORTING:**
  - `reportError(error)`:
    - Send error details to /debug/error
    - Include: message, stack, context
**State:**
- `debugServer`: URL of Python server
- `enabled`: Boolean
- `lastPoll`: Timestamp of last poll
- `commandQueue`: Pending commands
**Key Behaviors:**
- Non-intrusive (system works without bridge)
- Secure (only works on local network)
- Efficient (2s polling, not real-time WebSocket)
- Enables remote debugging from Surface Go 3

---

### **src/units/disc.u.js**
**Purpose:** Discovery - find other Statik.ai instances  
**Talks To:** bus.u (emits 'instance.discovered'), mesh.u, sync.u, adapters/network  
**Functions:**
- `async init()`:
  - Start discovery mechanisms
  - Announce own presence
  - Listen for other instances
- **LOCAL NETWORK DISCOVERY (mDNS):**
  - `announcePresence()`:
    - Broadcast on local network: "I'm Statik.ai at 192.168.1.15:8080"
    - Use mDNS/Bonjour protocol
    - Service name: _statik._tcp.local
  - `listenForPeers()`:
    - Listen for mDNS announcements
    - When discovered: emit 'instance.discovered'
- **BROADCAST CHANNEL (Same Origin):**
  - `createBroadcastChannel()`:
    - For multiple tabs/windows on same device
    - Channel name: 'statik-instances'
    - Instant discovery (no network needed)
  - `postAnnouncement()`:
    ```js
    bc.postMessage({
      type: 'announce',
      instance_id: 'statik_phone_abc',
      capabilities: ['storage', 'compute'],
      endpoints: ['http://localhost:8080']
    });
    ```
- **WEBRTC SIGNALING (Remote Discovery):**
  - `connectToSignalServer()`:
    - Use public STUN server or IPFS pubsub
    - Publish presence
    - Subscribe to /statik-ai/instances topic
  - `receiveSignal(signal)`:
    - Another instance signals presence
    - Establish WebRTC connection via mesh.u
- **DISCOVERY PROTOCOL:**
  - Announcement message:
  ```js
  {
    type: 'instance.announce',
    instance_id: 'statik_phone_abc123',
    version: '0.1.0',
    capabilities: ['storage', 'compute', 'webgpu'],
    transport: ['webrtc', 'local'],
    endpoints: [
      'ws://192.168.1.10:8080',
      'wss://instance-abc.pages.dev'
    ],
    public_key: '...' // Optional for encryption
  }
  ```
- **PEER LIST:**
  - `getDiscoveredPeers()`:
    - Return list of all discovered instances
    - Include: instance_id, last_seen, capabilities
  - `updatePeer(instanceId, metadata)`:
    - Update peer info when changes detected
- **HEARTBEAT:**
  - `sendHeartbeat()`:
    - Every 30s: announce still alive
    - Update last_seen timestamp
  - `checkPeerHealth()`:
    - If peer not seen >2min: mark as offline
**State:**
- `discoveredPeers`: Map<instance_id, metadata>
- `localEndpoints`: Own URLs/addresses
- `broadcastChannel`: BroadcastChannel instance
**Key Behaviors:**
- Multi-mechanism (local + remote discovery)
- Privacy-preserving (only announces if user allows)
- Automatic (no manual configuration)
- Resilient (works even if one mechanism fails)

---

### **src/units/mesh.u.js**
**Purpose:** P2P Mesh Networking - connect instances via WebRTC  
**Talks To:** bus.u, disc.u (receives discovered peers), sync.u  
**Functions:**
- `async init()`:
  - Initialize WebRTC configuration
  - Subscribe to discovery events
  - Set up STUN/TURN servers (for NAT traversal)
- **CONNECTION ESTABLISHMENT:**
  - `async connectToPeer(instanceId, endpoint)`:
    - Create RTCPeerConnection
    - Generate offer
    - Send via signaling channel
    - Wait for answer
    - Establish data channel
  - `handleIncomingConnection(signal)`:
    - Receive connection offer
    - Generate answer
    - Complete handshake
- **DATA CHANNELS:**
  - `createDataChannel(peerId, label)`:
    - Label: 'sync' | 'messages' | 'files'
    - Configure: ordered, reliable
    - Return channel for sending data
  - `onDataReceived(peerId, data)`:
    - Parse received data
    - Route to appropriate unit (sync.u, etc.)
- **MESSAGE ROUTING:**
  - `sendToPeer(peerId, message)`:
    - Serialize message
    - Send via data channel
    - Track delivery (optional ack)
  - `broadcast(message, excludePeer=null)`:
    - Send to all connected peers
    - Used for state updates
- **CONNECTION MANAGEMENT:**
  - `maintainConnections()`:
    - Monitor connection health (ping/pong)
    - Reconnect if connection drops
    - Prune dead connections
  - `disconnectPeer(peerId)`:
    - Close data channels
    - Close peer connection
    - Emit 'peer.disconnected'
- **NAT TRAVERSAL:**
  - STUN servers (for public IP discovery)
  - TURN servers (relay if direct connection fails)
  - ICE candidate gathering
- **TOPOLOGY:**
  - Mesh: every instance connects to every other
  - Max connections: 10 (prevent overload)
  - If >10 peers: prioritize by proximity/usage
- **SECURITY:**
  - `encryptMessage(message, publicKey)`:
    - Optional E2E encryption
    - Use peer's public key
  - `decryptMessage(encrypted, privateKey)`:
    - Decrypt with own private key
**State:**
- `connections`: Map<peerId, RTCPeerConnection>
- `dataChannels`: Map<peerId, RTCDataChannel>
- `peerHealth`: Map<peerId, last_ping>
**Key Behaviors:**
- Fully P2P (no central server after connection)
- NAT traversal (works behind routers)
- Resilient (auto-reconnect)
- Efficient (direct data channels, no proxies)
