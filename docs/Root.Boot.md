# Statik.ai - Complete File Specifications

---

## ROOT LEVEL FILES

### **index.html**
**Purpose:** Entry point and PWA shell for the entire application  
**Talks To:** manifest.json, sw.js, src/kernel/kernel.u.js, assets/styles/base.css  
**Functions:**
- Loads initial HTML structure (minimal, just container divs)
- Links to manifest.json for PWA configuration
- Registers service worker (sw.js)
- Imports kernel.u.js as ES module to bootstrap system
- Provides mounting points: `<div id="app">`, `<div id="inspector">`, `<div id="debug">`
- Includes meta tags for iOS standalone mode
- NO inline JavaScript (all in modules)
**Key Behaviors:**
- On load: registers service worker, imports kernel, calls `kernel.boot()`
- Minimal DOM (UI built by ui.u.js dynamically)

---

### **manifest.json**
**Purpose:** PWA manifest for installability and iOS home screen  
**Talks To:** index.html, assets/icons/*  
**Contains:**
- App name: "Statik.ai"
- Start URL: "./"
- Display mode: "standalone"
- Icons array (72x72, 180x180, 512x512)
- Theme color, background color
- Shortcuts (Quick Entry, Memory viewer)
- File handlers (JSON, CSV import)
- Share target configuration
**Key Behaviors:**
- Enables "Add to Home Screen" on iOS
- Configures standalone app behavior
- Defines app shortcuts and share targets

---

### **sw.js** (Service Worker)
**Purpose:** Offline capability, caching, background sync  
**Talks To:** All static assets, storage/cache.js  
**Functions:**
- `install` event: Pre-cache critical assets (index.html, kernel.u.js, base.css)
- `activate` event: Clean up old caches
- `fetch` event: Serve from cache first, network fallback
- Background sync: Periodic state backup
- Push notifications: Alert user to autonomous goals
**Key Behaviors:**
- Cache strategy: Stale-while-revalidate for assets
- Network-first for API calls (if any)
- Offline fallback page if network unavailable

---

### **README.md**
**Purpose:** User-facing documentation  
**Talks To:** None (standalone markdown)  
**Contains:**
- What is Statik.ai
- Installation instructions (open URL, add to home screen)
- Basic usage guide
- Architecture overview (high-level)
- Link to full docs/ folder
**Key Behaviors:**
- Written for end users, not developers
- Includes screenshots/examples

---

### **ARCHITECTURE.md**
**Purpose:** Technical architecture documentation  
**Talks To:** None (reference document)  
**Contains:**
- Complete system design
- Directory structure explanation
- Unit relationships and message flows
- Boot sequence details
- Extension guidelines
**Key Behaviors:**
- Written for developers
- Reference when adding new units

---

## BOOTSTRAP DIRECTORY

### **bootstrap/boot.js**
**Purpose:** Orchestrates cold start initialization  
**Talks To:** detect.js, hydrate.js, recover.js, src/kernel/kernel.u.js  
**Functions:**
- `async boot()`: Main entry point called by index.html
  - Step 1: Run detect.js (check environment)
  - Step 2: Run hydrate.js (load saved state or init fresh)
  - Step 3: Initialize kernel
  - Step 4: If error → run recover.js
- Returns: Boot status object `{success: true/false, mode: 'normal'/'safe'}`
**Key Behaviors:**
- Sequential execution (detect → hydrate → kernel)
- Error boundary: any failure triggers safe mode
- Logs each step to telemetry.u

---

### **bootstrap/detect.js**
**Purpose:** Environment and capability detection  
**Talks To:** configs/capabilities.json, adapters/ios/*, adapters/web/*  
**Functions:**
- `async detectEnvironment()`: 
  - Checks: iOS version, browser, WebGPU, OPFS, IndexedDB quota
  - Tests: localStorage, sessionStorage, Workers, WebRTC
  - Measures: Available storage, memory limits
- `async detectAPIs()`: Tests for each web API
- Returns: Capabilities object saved to configs/capabilities.json
**Key Behaviors:**
- Non-blocking: missing APIs don't fail boot
- Logs warnings for missing features
- Updates capabilities.json with detected features

---

### **bootstrap/hydrate.js**
**Purpose:** Restore system state from previous session  
**Talks To:** storage/db.js, configs/defaults.json  
**Functions:**
- `async loadState()`:
  - Check IndexedDB for saved state
  - If exists: Load unit states, memory, configurations
  - If not: Load defaults from configs/defaults.json
  - Return: Hydrated state object
- `async validateState()`: Ensure loaded state is valid
**Key Behaviors:**
- Graceful degradation: corrupt state → use defaults
- Version check: old state format → migrate or reset
- Returns clean state object to kernel

---

### **bootstrap/recover.js**
**Purpose:** Safe mode and crash recovery  
**Talks To:** ui.u.js (show error UI), storage/backup.js  
**Functions:**
- `async enterSafeMode()`:
  - Disable all non-critical units
  - Load minimal UI (error message + recovery options)
  - Offer: "Reset", "Restore Backup", "Continue Anyway"
- `async recoverFromCrash()`:
  - Analyze crash logs (from telemetry.u)
  - Identify failing unit
  - Restart with that unit disabled
**Key Behaviors:**
- Never throw errors (last resort handler)
- Always gives user control (reset, restore, continue)
- Logs recovery attempts to telemetry
