## SRC/UI DIRECTORY

### **src/ui/shell.js**
**Purpose:** Main UI shell and layout  
**Talks To:** ui.u, chat.js, inspector/*, controls/*  
**Functions:**
- `renderShell()`:
  - Create main layout:
  ```html
  <div id="shell">
    <header>
      <h1>Statik.ai</h1>
      <div id="status"></div>
    </header>
    <main>
      <div id="chat-container"></div>
      <div id="inspector-container" class="collapsed"></div>
    </main>
    <footer>
      <div id="controls"></div>
    </footer>
  </div>
  ```
- `toggleInspector()`:
  - Show/hide inspector panel
  - Animate transition
- `updateStatus(status)`:
  - Update header status indicator
  - Color: green/yellow/red
  - Text: current goal or "Ready"
- `setTheme(theme)`:
  - Apply CSS theme: 'dark' | 'light'
**Key Behaviors:**
- Responsive layout (mobile-first)
- Collapsible panels
- Accessible (keyboard navigation)

---

### **src/ui/chat.js**
**Purpose:** Chat interface for user interaction  
**Talks To:** ui.u, pce.u (sends input), nlp.u (receives responses)  
**Functions:**
- `renderChat(container)`:
  - Create chat UI:
  ```html
  <div id="chat">
    <div id="messages"></div>
    <div id="input-area">
      <input type="text" id="user-input" />
      <button id="send">Send</button>
    </div>
  </div>
  ```
- `appendMessage(message, sender)`:
  - Add message to history
  - sender: 'user' | 'system'
  - Format with timestamp
  - Auto-scroll to bottom
- `handleUserInput()`:
  - Get text from input
  - Emit to bus: 'ui.input'
  - Clear input field
  - Show typing indicator
- `showTypingIndicator()`:
  - Animated dots while processing
- `clearMessages()`:
  - Empty message history
**Key Behaviors:**
- Real-time updates
- Syntax highlighting for code blocks
- Markdown rendering (basic)

---

### **src/ui/inspector/memory.inspector.js**
**Purpose:** Memory inspection panel  
**Talks To:** cm.u (queries memories)  
**Functions:**
- `render(container)`:
  - Create memory viewer UI
  - List: recent memories, search results
- `loadMemories(limit=50)`:
  - Query cm.u for recent memories
  - Display in list
- `search(query)`:
  - Search memories by keyword
  - Display results
- `deleteMemory(id)`:
  - Delete specific memory
  - Confirm with user
**Key Behaviors:**
- Searchable
- Paginated (show 50 at a time)
- Sortable (by date, salience)

---

### **src/ui/inspector/goals.inspector.js**
**Purpose:** Goal queue inspection  
**Talks To:** gm.u  
**Functions:**
- `render(container)`:
  - Show goal queue
  - Highlight active goal
- `loadGoals()`:
  - Query gm.u for pending goals
  - Display with priority, deadline
- `cancelGoal(goalId)`:
  - Remove goal from queue
**Key Behaviors:**
- Real-time updates
- Color-coded by priority

---

### **src/ui/inspector/trace.inspector.js**
**Purpose:** Message flow visualization  
**Talks To:** telemetry.u  
**Functions:**
- `render(container)`:
  - Create trace viewer
  - Flow diagram: unit → unit
- `loadTrace(messageId)`:
  - Get message path from telemetry
  - Visualize flow
- `filterByUnit(unitId)`:
  - Show only messages to/from unit
**Key Behaviors:**
- Interactive (click to expand)
- Timeline view

---

### **src/ui/inspector/performance.inspector.js**
**Purpose:** Performance metrics display  
**Talks To:** telemetry.u  
**Functions:**
- `render(container)`:
  - Create metrics dashboard
  - Graphs: CPU, memory, throughput
- `updateMetrics()`:
  - Fetch from telemetry
  - Update charts (every 1s)
- `renderChart(metric, data)`:
  - Use canvas or chart library
  - Line chart for time-series
**Key Behaviors:**
- Live updating
- Historical view (last hour)

---

### **src/ui/editor/monaco.loader.js**
**Purpose:** Load Monaco editor library  
**Talks To:** vfs/editor.js  
**Functions:**
- `async loadMonaco()`:
  - Load Monaco from CDN
  - Configure AMD loader
  - Return monaco global
- `configureMonaco(monaco)`:
  - Set theme, language
  - Enable features
**Key Behaviors:**
- Lazy loading (only when needed)
- CDN fallback

---

### **src/ui/editor/file.browser.js**
**Purpose:** File browser for VFS  
**Talks To:** vfs/tree.js, vfs/editor.js  
**Functions:**
- `render(container)`:
  - Tree view of files
  - Expandable folders
- `onFileClick(path)`:
  - Open file in editor
- `onFileRightClick(path)`:
  - Context menu: rename, delete
**Key Behaviors:**
- Tree navigation
- File operations

---

### **src/ui/controls/pause.js**
**Purpose:** Pause/resume system  
**Talks To:** kernel.u, scheduler.js  
**Functions:**
- `renderPauseButton()`:
  - Button: "Pause" | "Resume"
- `togglePause()`:
  - Emit: 'system.pause' or 'system.resume'
  - Update button state
**Key Behaviors:**
- Visual feedback
- Keyboard shortcut (Space)

---

### **src/ui/controls/reset.js**
**Purpose:** Reset system  
**Talks To:** kernel.u, storage/*  
**Functions:**
- `renderResetButton()`:
  - Button: "Reset"
- `confirmReset()`:
  - Show confirmation dialog
  - Options: "Reset State" | "Reset Everything"
- `performReset(type)`:
  - Clear storage, reload
**Key Behaviors:**
- Confirmation required
- Non-destructive option (reset state, keep code)

---

### **src/ui/controls/export.js**
**Purpose:** Export system data  
**Talks To:** backup.js  
**Functions:**
- `renderExportButton()`:
  - Button: "Export"
- `triggerExport()`:
  - Call backup.exportAllData()
  - Download file
  - Filename: `statik-backup-${timestamp}.json`
**Key Behaviors:**
- One-click export
- Includes metadata
