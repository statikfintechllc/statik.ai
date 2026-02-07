## SRC/BUS DIRECTORY

### **src/bus/bus.u.js**
**Purpose:** Core message bus - zero-coupling communication between units  
**Talks To:** ALL units, validator.js, router.js, channels.js  
**Functions:**
- `emit(topic, payload)`: Fire-and-forget message
  - Validates payload against schema
  - Routes to all subscribers on topic
  - Returns immediately (async)
- `on(topic, callback)`: Subscribe to topic
  - Stores callback in subscriber map
  - Returns unsubscribe function
- `async request(topic, payload, timeout=5000)`: Request-response pattern
  - Emits message with correlation ID
  - Waits for response with matching ID
  - Throws TimeoutError if no response
- `stream(topic, payload)`: Continuous data stream
  - Returns AsyncIterator
  - Yields messages as they arrive
**Key Behaviors:**
- Topic wildcards: `unit.*` matches `unit.ready`, `unit.error`
- Priority channels: high/normal/low queues
- Message ordering: FIFO within priority level
- No direct unit references (decoupled)

---

### **src/bus/channels.js**
**Purpose:** Priority lanes for message routing  
**Talks To:** bus.u.js, router.js  
**Functions:**
- `createChannel(priority)`: Create new message channel
  - priority: 'high' | 'normal' | 'low'
  - Returns channel object with queue
- `enqueue(channel, message)`: Add message to channel queue
- `dequeue(channel)`: Remove and return next message
- `flush(channel)`: Clear all messages in channel
**Key Behaviors:**
- High priority processed first (user input, errors)
- Low priority for background tasks (memory consolidation)
- Backpressure: if queue >1000 messages, drop low priority

---

### **src/bus/router.js**
**Purpose:** Message routing logic - topic matching and delivery  
**Talks To:** bus.u.js, channels.js  
**Functions:**
- `route(topic, message)`: 
  - Match topic against subscriber patterns
  - Determine priority channel
  - Enqueue for delivery
- `matchPattern(topic, pattern)`: 
  - Supports wildcards: `unit.*`, `*.error`
  - Returns true/false
- `deliverMessage(subscriber, message)`:
  - Invoke subscriber callback
  - Catch and log errors (don't propagate)
**Key Behaviors:**
- Async delivery (non-blocking)
- Error isolation (one subscriber error doesn't stop others)
- Metrics tracking (messages/sec per topic)

---

### **src/bus/validator.js**
**Purpose:** Message schema validation  
**Talks To:** bus.u.js, schemas/messages/*  
**Functions:**
- `validate(message, schemaName)`:
  - Load schema from schemas/messages/
  - Validate message structure
  - Return: `{valid: true/false, errors: []}`
- `getSchema(schemaName)`: Load and cache schema
- `validateAll(messages)`: Batch validation
**Key Behaviors:**
- Schema caching (load once, reuse)
- Detailed error messages (which field failed, why)
- Non-blocking (validation errors logged, not thrown)

---

## SRC/RUNTIME DIRECTORY

### **src/runtime/scheduler.js**
**Purpose:** Task scheduling with priorities and deadlines  
**Talks To:** kernel.u, gm.u (goals), hc.u (throttling)  
**Functions:**
- `schedule(task, priority, deadline=null)`:
  - Add task to queue with metadata
  - Sort by priority, then deadline
  - Return task ID
- `async executeTasks()`:
  - Main loop (runs continuously)
  - Dequeue highest priority task
  - Execute with timeout
  - Track execution time
- `cancelTask(taskId)`: Remove from queue
- `pause()` / `resume()`: Global scheduler control
**Key Behaviors:**
- Priority levels: urgent (0-10), normal (11-50), low (51-100)
- Deadline enforcement: task past deadline → dropped
- CPU budget: if >80% CPU used → pause low priority tasks

---

### **src/runtime/allocator.js**
**Purpose:** Resource allocation (CPU%, memory budgets)  
**Talks To:** scheduler.js, hc.u, telemetry.u  
**Functions:**
- `allocateCPU(unitId, percentRequested)`:
  - Check current CPU usage
  - Grant or deny allocation
  - Track per-unit budgets
- `allocateMemory(unitId, bytesRequested)`:
  - Check available heap
  - Reserve memory for unit
  - Return allocation token
- `releaseResources(unitId)`: Free unit's allocations
- `getCurrentUsage()`: Return CPU% and memory usage
**Key Behaviors:**
- Fair allocation (no unit monopolizes resources)
- Enforces constraints.json limits
- Revokes allocations if unit exceeds budget

---

### **src/runtime/quota.js**
**Purpose:** Storage quota management  
**Talks To:** storage/db.js, storage/opfs.js, hc.u  
**Functions:**
- `async checkQuota()`:
  - Query navigator.storage.estimate()
  - Return: `{used: X, available: Y, percent: Z}`
- `async requestPersistent()`:
  - Request persistent storage (won't be evicted)
  - Returns true if granted
- `enforceLimit(store, limitMB)`:
  - Check if store exceeds limit
  - Trigger cleanup if over
**Key Behaviors:**
- Monitors quota every 60s
- Alerts hc.u when >90% full
- Prevents writes when >95% full

---

### **src/runtime/throttle.js**
**Purpose:** Rate limiting and backpressure  
**Talks To:** bus.u, scheduler.js  
**Functions:**
- `createThrottle(maxRate, window='1s')`:
  - Returns throttle function
  - maxRate: operations per window
  - Example: `throttle(100, '1s')` = 100 ops/sec max
- `throttle(fn)`:
  - Wraps function with rate limit
  - Queues calls that exceed rate
  - Discards oldest if queue full
- `backpressure(queueDepth, threshold)`:
  - Returns true if queueDepth > threshold
  - Signals producer to slow down
**Key Behaviors:**
- Token bucket algorithm (smooth rate limiting)
- Adaptive throttling (increases if errors occur)
- Per-unit throttles (one unit can't flood bus)

---

**Token check: Continue?**
