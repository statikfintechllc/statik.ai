## SRC/UTILS DIRECTORY

### **src/utils/id.js**
**Purpose:** Unique ID generation  
**Functions:**
- `generateId(prefix='')`:
  - Return: `${prefix}_${timestamp}_${random}`
  - Example: `ctx_1738777200_ab3f`
- `uuid()`:
  - Generate RFC4122 UUID v4
  - crypto.randomUUID() if available
**Key Behaviors:**
- Collision-resistant
- Timestamp-based (sortable)

---

### **src/utils/time.js**
**Purpose:** Time utilities  
**Functions:**
- `now()`:
  - Date.now() wrapper
- `formatTimestamp(timestamp)`:
  - Return human-readable: "2026-02-07 12:34:56"
- `elapsedTime(start, end)`:
  - Return duration in ms
- `sleep(ms)`:
  - await sleep(1000) = 1s delay
**Key Behaviors:**
- Consistent time formatting
- Duration helpers

---

### **src/utils/math.js**
**Purpose:** Math utilities  
**Functions:**
- `cosineSimilarity(vecA, vecB)`:
  - Dot product / (magnitude A * magnitude B)
- `normalize(vector)`:
  - Return unit vector
- `dotProduct(vecA, vecB)`:
  - Sum of element-wise products
- `mean(numbers)`:
  - Average
- `percentile(numbers, p)`:
  - Pth percentile value
**Key Behaviors:**
- Vector math (no external libs)
- Statistics helpers

---

### **src/utils/hash.js**
**Purpose:** Hashing for deduplication  
**Functions:**
- `async hash(data, algorithm='SHA-256')`:
  - crypto.subtle.digest()
  - Return hex string
- `simpleHash(string)`:
  - Fast non-crypto hash
  - For deduplication only
**Key Behaviors:**
- Crypto-grade (SHA-256)
- Fast alternative (simple hash)

---

### **src/utils/validate.js**
**Purpose:** Schema validation  
**Functions:**
- `validate(data, schema)`:
  - Check data against JSON schema
  - Return: {valid: boolean, errors: []}
- `loadSchema(path)`:
  - Load from schemas/*
**Key Behaviors:**
- Comprehensive validation
- Detailed error messages

---

### **src/utils/logger.js**
**Purpose:** Structured logging  
**Functions:**
- `log(level, unit, message, context)`:
  - Format and emit to telemetry.u
- `debug(unit, message)`:
  - Shorthand for log('debug', ...)
- `info(unit, message)`:
  - Shorthand for log('info', ...)
- `error(unit, message, error)`:
  - Include stack trace
**Key Behaviors:**
- Structured (JSON format)
- Unit tagging

---

### **src/utils/crypto.js**
**Purpose:** Crypto helpers  
**Functions:**
- `randomBytes(length)`:
  - crypto.getRandomValues()
- `randomInt(min, max)`:
  - Crypto-secure random integer
**Key Behaviors:**
- Crypto-grade randomness
