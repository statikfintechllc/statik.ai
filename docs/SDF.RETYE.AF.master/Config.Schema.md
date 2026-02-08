## CONFIGS DIRECTORY

### **configs/units.registry.json**
**Purpose:** Unit manifest - which units exist, their dependencies, boot order  
**Talks To:** kernel/registry.js, kernel/lifecycle.js  
**Structure:**
```json
{
  "units": [
    {
      "id": "pce.u",
      "path": "src/units/pce.u.js",
      "dependencies": ["bus.u"],
      "priority": 1,
      "required": true
    },
    // ... all 17+ units
  ]
}
```
**Key Behaviors:**
- Defines boot order via priority
- Kernel reads this to know what to load
- Dependencies enforce load sequence

---

### **configs/capabilities.json**
**Purpose:** Runtime feature flags based on detected environment  
**Talks To:** bootstrap/detect.js, all adapters  
**Structure:**
```json
{
  "webgpu": true,
  "opfs": true,
  "indexeddb": true,
  "workers": true,
  "storage_quota_mb": 500,
  "ios_version": "18.3",
  // ... all detected features
}
```
**Key Behaviors:**
- Written by detect.js at boot
- Read by units to conditionally enable features
- Updated if environment changes

---

### **configs/constraints.json**
**Purpose:** Hard limits to prevent runaway resource usage  
**Talks To:** runtime/allocator.js, runtime/quota.js, hc.u.js  
**Structure:**
```json
{
  "memory": {
    "max_indexeddb_mb": 100,
    "max_opfs_mb": 500
  },
  "cpu": {
    "max_per_unit_ms": 50,
    "max_total_percent": 80
  },
  "messages": {
    "max_queue_depth": 1000,
    "max_rate_per_sec": 100
  }
}
```
**Key Behaviors:**
- Enforced by hc.u (homeostasis)
- If exceeded: throttle, pause, or alert

---

### **configs/defaults.json**
**Purpose:** Default settings when no saved state exists  
**Talks To:** bootstrap/hydrate.js  
**Structure:**
```json
{
  "units": {
    "pce.u": { "enabled": true },
    "gm.u": { "enabled": true, "autonomy_level": "low" }
  },
  "ui": {
    "theme": "dark",
    "chat_visible": true
  }
}
```
**Key Behaviors:**
- First boot configuration
- Reset fallback if hydration fails

---

## SCHEMAS DIRECTORY

### **schemas/messages/context.schema.json**
**Purpose:** Validates ContextFrame messages from pce.u  
**Talks To:** bus/validator.js  
**Schema:**
```json
{
  "type": "object",
  "required": ["id", "timestamp", "source"],
  "properties": {
    "id": {"type": "string"},
    "timestamp": {"type": "number"},
    "source": {"type": "string"},
    "raw": {"type": "string"},
    "tokens": {"type": "array"},
    "novelty_score": {"type": "number", "min": 0, "max": 1}
  }
}
```
**Key Behaviors:**
- Bus validates all context messages against this
- Invalid messages dropped and logged

---

### **schemas/messages/intent.schema.json**
**Purpose:** Validates Intent messages from nlp.u  
**Talks To:** bus/validator.js  
**Schema:**
```json
{
  "type": "object",
  "required": ["intent_type", "confidence"],
  "properties": {
    "intent_type": {"enum": ["query", "command", "statement"]},
    "confidence": {"type": "number", "min": 0, "max": 1},
    "entities": {"type": "array"},
    "slots": {"type": "object"}
  }
}
```

---

### **schemas/messages/memory.schema.json**
**Purpose:** Validates Memory storage/retrieval messages  
**Talks To:** bus/validator.js, cm.u  
**Schema:**
```json
{
  "type": "object",
  "oneOf": [
    {"required": ["action", "data"], "properties": {"action": {"const": "store"}}},
    {"required": ["action", "query"], "properties": {"action": {"const": "retrieve"}}}
  ]
}
```

---

### **schemas/messages/action.schema.json**
**Purpose:** Validates Action execution messages from ie.u  
**Talks To:** bus/validator.js, ie.u  
**Schema:**
```json
{
  "type": "object",
  "required": ["action_type", "target"],
  "properties": {
    "action_type": {"enum": ["ui_update", "storage_write", "network_call"]},
    "target": {"type": "string"},
    "payload": {"type": "object"}
  }
}
```

---

### **schemas/storage/episodes.schema.json**
**Purpose:** Defines structure for episodic memory entries  
**Talks To:** storage/db.js, cm.u  
**Schema:**
```json
{
  "type": "object",
  "required": ["id", "timestamp", "context", "salience"],
  "properties": {
    "id": {"type": "string"},
    "timestamp": {"type": "number"},
    "context": {"type": "object"},
    "salience": {"type": "number"},
    "tags": {"type": "array", "items": {"type": "string"}}
  }
}
```
**Key Behaviors:**
- Used by migrations.js to validate DB structure
- cm.u enforces this when storing episodes

---

### **schemas/storage/concepts.schema.json**
**Purpose:** Defines semantic memory (facts, relationships)  
**Schema:**
```json
{
  "type": "object",
  "required": ["id", "name", "definition"],
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "definition": {"type": "string"},
    "relations": {"type": "array"},
    "confidence": {"type": "number", "min": 0, "max": 1}
  }
}
```

---

### **schemas/storage/skills.schema.json**
**Purpose:** Defines procedural memory (how to do things)  
**Schema:**
```json
{
  "type": "object",
  "required": ["id", "name", "procedure"],
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "procedure": {"type": "array", "items": {"type": "string"}},
    "success_rate": {"type": "number"},
    "last_used": {"type": "number"}
  }
}
```

---

### **schemas/state/unit.state.schema.json**
**Purpose:** Validates unit state snapshots  
**Schema:**
```json
{
  "type": "object",
  "required": ["unit_id", "state", "last_updated"],
  "properties": {
    "unit_id": {"type": "string"},
    "state": {"type": "object"},
    "last_updated": {"type": "number"}
  }
}
```

---

### **schemas/state/kernel.state.schema.json**
**Purpose:** Validates kernel state  
**Schema:**
```json
{
  "type": "object",
  "required": ["boot_count", "uptime"],
  "properties": {
    "boot_count": {"type": "integer"},
    "uptime": {"type": "number"},
    "crashes": {"type": "array"},
    "version": {"type": "string"}
  }
}
```
