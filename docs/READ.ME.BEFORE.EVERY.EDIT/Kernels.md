## SRC/KERNEL DIRECTORY

### **src/kernel/kernel.u.js**
**Purpose:** Central orchestrator - the brain's "operating system"  
**Talks To:** ALL units, bus.u, lifecycle.js, registry.js, watchdog.js  
**Functions:**
- `async boot()`: 
  - Initialize bus
  - Load registry
  - Start lifecycle
  - Spawn watchdog
  - Emit 'system.ready' when done
- `getStatus()`: Return status of all units
- `async shutdown()`: Graceful shutdown sequence
**Key Behaviors:**
- Single source of truth for system state
- Coordinates unit initialization order
- Handles global errors
- Never throws (logs and recovers)

---

### **src/kernel/lifecycle.js**
**Purpose:** Manages unit lifecycle (init, start, stop, restart)  
**Talks To:** kernel.u, registry.js, all units  
**Functions:**
- `async initializeUnits()`:
  - Read registry for order
  - Initialize units by priority
  - Wait for each unit's ready signal
  - Track initialization state
- `async startUnit(unitId)`: Start specific unit
- `async stopUnit(unitId)`: Stop specific unit
- `async restartUnit(unitId)`: Stop then start
**Key Behaviors:**
- Sequential initialization (respects dependencies)
- Timeout detection (unit takes >10s → fail)
- State tracking (unitId → 'init'|'running'|'stopped'|'error')

---

### **src/kernel/registry.js**
**Purpose:** Unit registry - tracks available units  
**Talks To:** configs/units.registry.json, lifecycle.js  
**Functions:**
- `loadRegistry()`: Read units.registry.json
- `getUnit(id)`: Return unit metadata
- `getAllUnits()`: Return all registered units
- `registerUnit(metadata)`: Add new unit at runtime
**Key Behaviors:**
- Immutable after boot (unless explicitly updated)
- Validates unit metadata structure
- Returns null if unit not found (no errors)

---

### **src/kernel/watchdog.js**
**Purpose:** Detect and recover from unit crashes  
**Talks To:** lifecycle.js, telemetry.u, recover.js  
**Functions:**
- `startMonitoring()`: Begin health checks
- `checkHealth()`: Poll each unit for heartbeat
  - If unit unresponsive >5s → attempt restart
  - If restart fails 3x → disable unit
- `reportCrash(unitId, error)`: Log crash to telemetry
**Key Behaviors:**
- Runs in background (setInterval every 5s)
- Isolates failures (one unit crash doesn't kill system)
- Escalates to safe mode if kernel crashes
