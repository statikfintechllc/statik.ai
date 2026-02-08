## SRC/STORAGE DIRECTORY

### **src/storage/db.js**
**Purpose:** Main IndexedDB initialization and interface  
**Talks To:** adapters/web/indexeddb.adapter.js, all units that need storage  
**Functions:**
- `async initializeDatabases()`:
  - Open all databases:
    - statik_memory (episodes, concepts, skills)
    - statik_state (unit_states, kernel_state)
    - statik_logs (deltas, errors, actions)
  - Run migrations if needed
  - Return database handles
- **MEMORY DB:**
  - `async storeEpisode(episode)`:
    - Insert into episodes store
  - `async queryEpisodes(query)`:
    - Query by timestamp, tags, salience
  - `async storeConcept(concept)`:
    - Insert into concepts store
  - `async storeSkill(skill)`:
    - Insert into skills store
- **STATE DB:**
  - `async saveUnitState(unitId, state)`:
    - Save unit state snapshot
  - `async loadUnitState(unitId)`:
    - Load saved state
  - `async saveKernelState(state)`:
    - Save kernel metadata
- **LOGS DB:**
  - `async logDelta(delta)`:
    - Append to deltas store
  - `async logError(error)`:
    - Append to errors store
  - `async logAction(action)`:
    - Append to actions store
- **MAINTENANCE:**
  - `async vacuumDatabase(dbName)`:
    - Compact database (reclaim space)
  - `async getStorageUsage()`:
    - Return usage per database
**State:**
- `databases`: Map<dbName, IDBDatabase>
**Key Behaviors:**
- Single initialization (lazy open)
- Connection pooling (reuse handles)
- Graceful degradation (if storage fails, use memory)

---

### **src/storage/migrations.js**
**Purpose:** Schema migrations for database upgrades  
**Talks To:** db.js  
**Functions:**
- `runMigrations(db, oldVersion, newVersion)`:
  - Execute migrations sequentially
  - Version 1 → 2 → 3 etc.
- **MIGRATION DEFINITIONS:**
  ```js
  const migrations = [
    {
      version: 1,
      upgrade: (db) => {
        db.createObjectStore('episodes', {keyPath: 'id'});
        db.createObjectStore('concepts', {keyPath: 'id'});
      }
    },
    {
      version: 2,
      upgrade: (db) => {
        const store = db.transaction.objectStore('episodes');
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('salience', 'salience');
      }
    }
  ];
  ```
- `validateSchema(db, expectedSchema)`:
  - Verify database structure matches expectations
  - Return validation errors
**Key Behaviors:**
- Idempotent (safe to run multiple times)
- Backward compatible (data preserved)
- Rollback on error (all-or-nothing)

---

### **src/storage/backup.js**
**Purpose:** Export and import system state  
**Talks To:** db.js, sync.u, ui.u (download trigger)  
**Functions:**
- `async exportAllData()`:
  - Query all databases
  - Serialize to JSON
  - Compress (optional)
  - Return blob
  - Structure:
  ```js
  {
    version: '0.1.0',
    timestamp: Date.now(),
    databases: {
      statik_memory: {
        episodes: [...],
        concepts: [...],
        skills: [...]
      },
      statik_state: {...},
      statik_logs: {...}
    },
    metadata: {
      instance_id: '...',
      export_reason: 'manual'
    }
  }
  ```
- `async importData(blob)`:
  - Parse JSON
  - Validate structure
  - Confirm with user (overwrite warning)
  - Restore to databases
  - Trigger system reload
- `async exportSelective(options)`:
  - Options: {memories: true, patterns: false, logs: false}
  - Export only selected data
- `scheduleAutoBackup(intervalHours)`:
  - Automatic periodic backups
  - Store in OPFS or offer download
**Key Behaviors:**
- User-controlled (never auto-export without permission)
- Includes metadata (version, timestamp)
- Validates imports (prevent corruption)

---

### **src/storage/opfs.js**
**Purpose:** Origin Private File System operations  
**Talks To:** adapters/ios/storage.adapter.js, vfs/*, backup.js  
**Functions:**
- `async init()`:
  - Get OPFS root handle
  - Create directory structure
- **FILE OPERATIONS:**
  - `async writeFile(path, content)`:
    - Create file handle
    - Write content (text or binary)
  - `async readFile(path)`:
    - Open file handle
    - Read contents
    - Return as string or ArrayBuffer
  - `async deleteFile(path)`:
    - Remove file
  - `async exists(path)`:
    - Check if file exists
- **DIRECTORY OPERATIONS:**
  - `async createDirectory(path)`:
    - Create nested directories
  - `async listFiles(path)`:
    - Return array of files in directory
  - `async getFileSize(path)`:
    - Return file size in bytes
- **LARGE FILES:**
  - `async writeStream(path)`:
    - Return writable stream
    - For large file writes
  - `async readStream(path)`:
    - Return readable stream
    - For large file reads
**State:**
- `rootHandle`: FileSystemDirectoryHandle
**Key Behaviors:**
- Persistent (survives browser restart)
- Private (not accessible to other sites)
- Faster than IndexedDB for large files

---

### **src/storage/cache.js**
**Purpose:** Service Worker cache management  
**Talks To:** sw.js  
**Functions:**
- `async cacheAssets(assets)`:
  - Add assets to cache
  - Assets: ['/index.html', '/kernel.u.js', ...]
- `async getCached(url)`:
  - Retrieve from cache
  - Return cached response or null
- `async updateCache(url, response)`:
  - Update cached version
  - Stale-while-revalidate pattern
- `async clearCache(cacheName)`:
  - Delete entire cache
- `async listCached()`:
  - Return array of cached URLs
**Key Behaviors:**
- Enables offline functionality
- Automatic cache updates
- Size limits (quota managed)

---

## SRC/VFS DIRECTORY

### **src/vfs/vfs.js**
**Purpose:** Virtual File System - system can edit its own code  
**Talks To:** opfs.js, tree.js, editor.js  
**Functions:**
- `async init()`:
  - Load entire source tree into memory
  - Build file tree structure
  - Mount as virtual filesystem
- `async loadSourceTree()`:
  - Fetch all .js, .json, .html, .css files
  - Store in memory map: path → content
- `async readFile(path)`:
  - Return file contents from VFS
  - If not in memory: fetch from OPFS or network
- `async writeFile(path, content)`:
  - Update in-memory version
  - Mark as modified
  - Optionally persist to OPFS
- `listFiles(directory='/')`:
  - Return array of files in directory
  - Recursive option
- `async saveAll()`:
  - Persist all modified files to OPFS
  - Update version number
- `async revertFile(path)`:
  - Discard modifications
  - Reload from OPFS or original
- `getModifiedFiles()`:
  - Return list of unsaved changes
**State:**
- `fileTree`: In-memory file structure
- `modifiedFiles`: Set of changed paths
**Key Behaviors:**
- Entire codebase accessible in browser
- Changes staged (not auto-saved)
- Version control (track changes)

---

### **src/vfs/tree.js**
**Purpose:** File tree structure and navigation  
**Talks To:** vfs.js, editor.js (file browser)  
**Functions:**
- `buildTree(files)`:
  - Convert flat file list to tree structure
  - Return nested object:
  ```js
  {
    'src': {
      'kernel': {
        'kernel.u.js': {type: 'file', size: 1234},
        'lifecycle.js': {type: 'file', size: 567}
      }
    }
  }
  ```
- `findFile(path)`:
  - Navigate tree to file
  - Return file node or null
- `getChildren(path)`:
  - Return immediate children of directory
- `getParent(path)`:
  - Return parent directory path
**Key Behaviors:**
- Efficient tree structure
- Fast lookups

---

### **src/vfs/editor.js**
**Purpose:** Monaco editor integration  
**Talks To:** vfs.js, monaco.loader.js, ui.u  
**Functions:**
- `async initEditor(container)`:
  - Load Monaco editor
  - Mount in DOM container
  - Configure for JavaScript
- `async openFile(path)`:
  - Load file from VFS
  - Display in editor
  - Enable syntax highlighting
- `getCurrentContent()`:
  - Return editor text content
- `onContentChange(callback)`:
  - Listen to editor changes
  - Mark file as modified
- `async saveFile()`:
  - Get current content
  - Write to VFS
- `async format()`:
  - Auto-format code (Prettier-like)
- `async showDiff(originalPath, modifiedPath)`:
  - Show side-by-side diff
  - Highlight changes
**State:**
- `editor`: Monaco editor instance
- `currentFile`: Open file path
**Key Behaviors:**
- Full IDE in browser
- IntelliSense (basic)
- Syntax highlighting

---

### **src/vfs/loader.js**
**Purpose:** Dynamic module loading and hot reload  
**Talks To:** vfs.js, kernel.u  
**Functions:**
- `async loadModule(path)`:
  - Dynamically import ES module
  - Return module exports
- `async reloadModule(path)`:
  - Invalidate module cache
  - Re-import fresh version
  - Update live system
- `async hotReload(modifiedFiles)`:
  - Reload changed modules
  - Update running units
  - Preserve state where possible
- `canHotReload(path)`:
  - Check if module supports hot reload
  - Some modules require full restart
**Key Behaviors:**
- Live code updates (no page reload)
- State preservation (where possible)
- Rollback on error

---

### **src/vfs/snapshot.js**
**Purpose:** Create system snapshots (sfti.iso)  
**Talks To:** vfs.js, backup.js, storage/*  
**Functions:**
- `async createSnapshot()`:
  - Bundle:
    - Complete source tree
    - Current system state
    - Configurations
    - Metadata
  - Compress to single file
  - Return blob
- Structure:
  ```js
  {
    meta: {
      version: '0.1.0',
      created: '2026-02-07T12:00:00Z',
      hash: 'sha256...'
    },
    source: {
      'index.html': '<html>...',
      'src/kernel/kernel.u.js': 'export class...',
      // ... all files
    },
    state: {
      memory: {...},
      units: {...}
    },
    config: {...}
  }
  ```
- `async loadSnapshot(blob)`:
  - Parse snapshot
  - Validate integrity (hash check)
  - Restore source files
  - Restore state
  - Reboot system
- `async exportISO()`:
  - Create sfti.iso file
  - Self-bootstrapping image
  - Can be hosted anywhere
**Key Behaviors:**
- Complete system in one file
- Self-contained (includes everything)
- Bootstraps from scratch
