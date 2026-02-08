## SRC/ADAPTERS DIRECTORY

### **src/adapters/ios/hardware.adapter.js**
**Purpose:** iOS hardware access (camera, sensors, haptics)  
**Talks To:** pce.u (provides sensor data), capabilities.json  
**Functions:**
- `async init()`:
  - Check iOS version and capabilities
  - Request permissions (camera, motion, location)
  - Initialize sensor listeners
- **CAMERA ACCESS:**
  - `async requestCamera()`:
    - navigator.mediaDevices.getUserMedia({video: true})
    - Return stream for OCR/vision features
  - `async capturePhoto()`:
    - Capture single frame from stream
    - Return as blob or base64
- **MOTION SENSORS:**
  - `startMotionTracking()`:
    - Listen to DeviceMotionEvent
    - Track: acceleration, rotation rate
    - Emit to bus: 'sensor.motion'
  - `getOrientation()`:
    - DeviceOrientationEvent
    - Return: alpha, beta, gamma (rotation)
- **GEOLOCATION:**
  - `async getCurrentPosition()`:
    - navigator.geolocation.getCurrentPosition()
    - Return: {latitude, longitude, accuracy}
  - `watchPosition(callback)`:
    - Continuous position tracking
    - For location-aware features
- **HAPTIC FEEDBACK:**
  - `vibrate(pattern)`:
    - navigator.vibrate([duration, pause, duration])
    - iOS supports limited patterns
  - `tapticFeedback(type)`:
    - Type: 'success' | 'warning' | 'error'
    - iOS-specific haptic patterns
- **AMBIENT LIGHT:**
  - `getAmbientLight()`:
    - AmbientLightSensor API (if available)
    - Return lux value
- **BATTERY STATUS:**
  - `getBatteryInfo()`:
    - navigator.getBattery()
    - Return: level, charging status
**State:**
- `permissions`: Map<feature, granted/denied>
- `activeStreams`: Open camera/mic streams
**Key Behaviors:**
- Graceful degradation (feature not available → skip)
- Permission handling (request, track, respect denials)
- Battery-conscious (stop sensors when idle)

---

### **src/adapters/ios/storage.adapter.js**
**Purpose:** iOS storage APIs (OPFS, quota management)  
**Talks To:** storage/opfs.js, storage/quota.js  
**Functions:**
- `async init()`:
  - Check OPFS availability
  - Request persistent storage
  - Query storage quota
- **OPFS OPERATIONS:**
  - `async getFileSystemRoot()`:
    - navigator.storage.getDirectory()
    - Return root FileSystemDirectoryHandle
  - `async writeFile(path, data)`:
    - Write to Origin Private File System
    - Create directories if needed
    - Return success/failure
  - `async readFile(path)`:
    - Read from OPFS
    - Return file contents
  - `async deleteFile(path)`:
    - Remove file from OPFS
  - `async listDirectory(path)`:
    - Return array of files/folders
- **QUOTA MANAGEMENT:**
  - `async checkQuota()`:
    - navigator.storage.estimate()
    - Return: {usage, quota, percentUsed}
  - `async requestPersistent()`:
    - navigator.storage.persist()
    - Request persistent storage (won't be evicted)
    - Return granted/denied
- **ICLOUD SYNC:**
  - `isCloudSyncEnabled()`:
    - Check if OPFS syncs with iCloud
    - iOS-specific behavior
  - Note: Automatic if user enables iCloud for site
**State:**
- `rootHandle`: FileSystemDirectoryHandle
- `persistentGranted`: Boolean
**Key Behaviors:**
- OPFS preferred over IndexedDB for large files
- Automatic directory creation
- Error handling (quota exceeded → alert)

---

### **src/adapters/ios/network.adapter.js**
**Purpose:** Network detection and management on iOS  
**Talks To:** bus.u (emits 'network.status'), bridge.u  
**Functions:**
- `async init()`:
  - Listen to online/offline events
  - Detect connection type
  - Monitor network changes
- **CONNECTION STATUS:**
  - `isOnline()`:
    - Return navigator.onLine
  - `getConnectionType()`:
    - navigator.connection.effectiveType
    - Return: '4g' | '3g' | 'wifi' | 'slow-2g'
  - `onConnectionChange(callback)`:
    - Listen to connection changes
    - Emit 'network.status' on change
- **BACKGROUND FETCH:**
  - `async registerBackgroundFetch(tag)`:
    - iOS Background Fetch API
    - Schedule periodic updates
  - `async updateInBackground()`:
    - Fetch data while app in background
    - Limited by iOS (controlled intervals)
- **NETWORK QUALITY:**
  - `measureLatency()`:
    - Ping known endpoint
    - Return round-trip time
  - `measureBandwidth()`:
    - Download small file
    - Calculate speed
**State:**
- `isConnected`: Boolean
- `connectionType`: String
- `lastCheck`: Timestamp
**Key Behaviors:**
- Emits events on network changes
- Adapts behavior to connection quality
- Background updates (if user enables)

---

### **src/adapters/ios/permissions.adapter.js**
**Purpose:** Permission request and tracking  
**Talks To:** hardware.adapter.js, storage.adapter.js  
**Functions:**
- `async requestPermission(type)`:
  - Type: 'camera' | 'microphone' | 'location' | 'notifications' | 'storage'
  - Show native permission dialog
  - Return granted/denied
  - Cache result
- `checkPermission(type)`:
  - Query permission status without prompting
  - Return: 'granted' | 'denied' | 'prompt'
- `async requestMultiple(types)`:
  - Request array of permissions
  - Return map: {camera: true, location: false}
- `onPermissionChange(type, callback)`:
  - Listen for permission revocations
  - iOS can revoke at any time
**State:**
- `permissions`: Map<type, status>
**Key Behaviors:**
- Never assumes permissions (always check)
- Explains why permission needed (UI prompt)
- Handles denials gracefully

---

### **src/adapters/web/webgpu.adapter.js**
**Purpose:** WebGPU compute acceleration  
**Talks To:** cm.u (similarity search), workers/compute.worker.js  
**Functions:**
- `async init()`:
  - Check WebGPU availability
  - Request GPU adapter
  - Create device
- **GPU COMPUTE:**
  - `async createComputePipeline(shaderCode)`:
    - Compile WGSL shader
    - Return pipeline for execution
  - `async runCompute(pipeline, data)`:
    - Upload data to GPU buffer
    - Execute compute shader
    - Download result
- **USE CASES:**
  - `async parallelSimilaritySearch(query, memories)`:
    - Compute cosine similarity on GPU
    - Process 1000s of memories in parallel
    - Much faster than CPU
  - `async batchVectorOps(vectors, operation)`:
    - Matrix multiplication
    - Vector normalization
    - Parallel processing
- **FALLBACK:**
  - If WebGPU unavailable → use CPU (workers)
  - Graceful degradation
**State:**
- `adapter`: GPUAdapter
- `device`: GPUDevice
- `available`: Boolean
**Key Behaviors:**
- Optional enhancement (not required)
- Significant speedup for vector operations
- Automatic fallback to CPU

---

### **src/adapters/web/indexeddb.adapter.js**
**Purpose:** IndexedDB abstraction layer  
**Talks To:** storage/db.js  
**Functions:**
- `async openDatabase(name, version, schema)`:
  - Open or create IndexedDB
  - Run migrations if version changed
  - Return db handle
- `async transaction(storeName, mode, callback)`:
  - Wrapper for IndexedDB transactions
  - Mode: 'readonly' | 'readwrite'
  - Auto-retry on transient errors
- `async query(storeName, indexName, query)`:
  - Query with index
  - Return cursor results as array
- `async put(storeName, data)`:
  - Insert or update record
  - Return key
- `async delete(storeName, key)`:
  - Delete record by key
- `async clear(storeName)`:
  - Delete all records in store
**State:**
- `databases`: Map<name, IDBDatabase>
**Key Behaviors:**
- Promise-based API (wraps callbacks)
- Error handling (quota, transactions)
- Migration support

---

### **src/adapters/web/notifications.adapter.js**
**Purpose:** Web Notifications API  
**Talks To:** gm.u (autonomous goal notifications)  
**Functions:**
- `async requestPermission()`:
  - Notification.requestPermission()
  - Return granted/denied
- `showNotification(title, options)`:
  - new Notification(title, {body, icon, badge})
  - Show system notification
- `onNotificationClick(callback)`:
  - Handle notification clicks
  - Can open app or specific view
- `registerServiceWorkerNotification(title, body)`:
  - Show notification via service worker
  - Works even when app closed
**State:**
- `permissionGranted`: Boolean
**Key Behaviors:**
- Respects user preferences
- Only for important events (autonomous goals, errors)

---

### **src/adapters/universal/crypto.adapter.js**
**Purpose:** WebCrypto API wrapper  
**Talks To:** sync.u (encryption), storage/backup.js  
**Functions:**
- `async generateKeyPair()`:
  - crypto.subtle.generateKey('RSA-OAEP')
  - Return {publicKey, privateKey}
- `async encrypt(data, publicKey)`:
  - Encrypt data with public key
  - Return encrypted bytes
- `async decrypt(encrypted, privateKey)`:
  - Decrypt with private key
  - Return original data
- `async hash(data, algorithm='SHA-256')`:
  - crypto.subtle.digest()
  - Return hash as hex string
- `async sign(data, privateKey)`:
  - Digital signature
  - For message authentication
- `async verify(signature, data, publicKey)`:
  - Verify signature
  - Return true/false
**Key Behaviors:**
- Uses native WebCrypto (fast, secure)
- No external crypto libraries needed
- All operations async

---

### **src/adapters/universal/time.adapter.js**
**Purpose:** High-precision timing  
**Talks To:** telemetry.u, scheduler.js  
**Functions:**
- `now()`:
  - performance.now()
  - High-resolution timestamp (sub-millisecond)
- `mark(label)`:
  - performance.mark(label)
  - Create named timestamp
- `measure(name, startMark, endMark)`:
  - performance.measure()
  - Calculate duration between marks
- `getEntries()`:
  - performance.getEntries()
  - Return all performance entries
- `clearMarks()`:
  - Clear performance marks
**Key Behaviors:**
- Monotonic (doesn't go backwards)
- High precision (microseconds)
- Used for profiling
