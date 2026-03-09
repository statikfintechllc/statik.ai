## SRC/WORKERS DIRECTORY

### **src/workers/cognition.worker.js**
**Purpose:** Heavy computation without blocking main thread  
**Talks To:** Main thread (postMessage/onmessage), none directly  
**Functions:**
- `onmessage(event)`:
  - Receive task from main thread
  - Execute based on task.type
  - postMessage result back
- **TASK TYPES:**
  - `pattern_match`:
    - Input: text, patterns array
    - Process: match text against all patterns
    - Output: best matching pattern + score
  - `similarity_score`:
    - Input: two texts
    - Process: TF-IDF vectors + cosine similarity
    - Output: similarity score 0-1
  - `vector_operations`:
    - Input: vectors, operation
    - Process: add, subtract, normalize vectors
    - Output: result vector
  - `batch_processing`:
    - Input: array of items, function
    - Process: apply function to each (parallel)
    - Output: results array
- **PERFORMANCE:**
  - No DOM access (worker isolation)
  - CPU-intensive tasks only
  - Returns results asynchronously
**Key Behaviors:**
- Never blocks UI thread
- Can run multiple workers (thread pool)
- Terminates after idle timeout (save memory)

---

### **src/workers/memory.worker.js**
**Purpose:** Database operations without blocking main thread  
**Talks To:** Main thread, IndexedDB  
**Functions:**
- `onmessage(event)`:
  - Receive DB operation from main thread
  - Execute against IndexedDB
  - Return result
- **DB OPERATIONS:**
  - `store`:
    - Input: store name, data
    - Insert into IndexedDB
    - Output: success/failure
  - `retrieve`:
    - Input: store name, query
    - Query IndexedDB
    - Output: matching records
  - `delete`:
    - Input: store name, id
    - Delete from IndexedDB
    - Output: success
  - `bulk_store`:
    - Input: array of records
    - Transaction: insert all
    - Output: success count
- **INDEXING:**
  - Create indexes for fast queries
  - Query by: timestamp, salience, tags
- **CONSOLIDATION:**
  - Merge similar memories
  - Prune old low-salience records
  - Run during idle time
**Key Behaviors:**
- All DB ops in worker (UI never blocks)
- Transaction-based (atomic operations)
- Error handling (retry transient failures)

---

### **src/workers/nlp.worker.js**
**Purpose:** Language processing without blocking main thread  
**Talks To:** Main thread  
**Functions:**
- `onmessage(event)`:
  - Receive text processing task
  - Execute NLP pipeline
  - Return result
- **NLP TASKS:**
  - `tokenize`:
    - Split text into tokens
    - Handle punctuation, contractions
  - `pos_tag`:
    - Part-of-speech tagging (basic rules)
    - Identify: nouns, verbs, adjectives
  - `extract_entities`:
    - Find: dates, numbers, names (regex)
  - `sentiment`:
    - Simple positive/negative/neutral
    - Word-based scoring
- **OPTIMIZATION:**
  - Cache tokenization results
  - Reuse parsed structures
**Key Behaviors:**
- Fast tokenization (<10ms)
- Rule-based (no ML models)
- Returns structured data

---

### **src/workers/compute.worker.js**
**Purpose:** Math and crypto operations  
**Talks To:** Main thread  
**Functions:**
- `onmessage(event)`:
  - Receive compute task
  - Execute and return
- **TASKS:**
  - `hash`:
    - Generate SHA-256 hash
    - For deduplication
  - `encrypt` / `decrypt`:
    - AES encryption (WebCrypto API)
  - `vector_math`:
    - Dot product, normalization
  - `statistics`:
    - Mean, median, percentiles
**Key Behaviors:**
- Uses WebCrypto API
- Offloads expensive math
- Returns results as typed arrays

---

### **src/workers/inference.worker.js**
**Purpose:** On-device ML model inference without blocking main thread
**Talks To:** Main thread (postMessage/onmessage), OPFS (model files)
**Functions:**
- `onmessage(event)`:
  - Receive inference task from main thread
  - Load model if not cached
  - Execute inference
  - postMessage result back
- **INFERENCE TASKS:**
  - `load_model`:
    - Input: model path in OPFS
    - Process: Load ONNX model via ONNX Runtime Web (WASM backend)
    - Output: model ID for subsequent inference calls
    - Cache: Keep loaded models in Worker memory (LRU, max 3 models)
  - `classify`:
    - Input: model ID, tokenized text (Float32Array)
    - Process: Run model forward pass
    - Output: classification label + confidence score
  - `extract_entities`:
    - Input: model ID, tokenized text
    - Process: Run NER model
    - Output: array of { entity, type, start, end, confidence }
  - `embed`:
    - Input: model ID, tokenized text
    - Process: Generate embedding vector
    - Output: Float32Array embedding
  - `unload_model`:
    - Input: model ID
    - Process: Free model from Worker memory
    - Output: success
- **BACKENDS:**
  - Primary: ONNX Runtime Web with WASM backend
  - Enhanced: ONNX Runtime Web with WebGPU backend (via webgpu.adapter)
  - Fallback: Pure WASM execution if WebGPU unavailable
- **PERFORMANCE:**
  - Model load: ~100-500ms (cached after first load)
  - Inference: <200ms per input
  - Memory: ~50-200MB per loaded model
  - LRU cache: evict least-recently-used model when memory pressure detected
**Key Behaviors:**
- Never blocks UI thread
- Models loaded lazily (only when Tier 3 NLP triggered)
- Graceful degradation: WebGPU → WASM → skip (use Tier 1/2 only)
- Memory-aware: monitors Worker heap, unloads models when hc.u signals pressure
