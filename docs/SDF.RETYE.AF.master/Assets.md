## ASSETS DIRECTORY

### **assets/icons/icon-72.png**
**Purpose:** PWA icon for various display sizes  
**Specifications:**
- Size: 72x72px
- Format: PNG with transparency
- Content: Statik.ai logo (user-provided)
- Used by: manifest.json for home screen icon
**Requirements:**
- Sharp, high-contrast design
- Recognizable at small sizes
- Works on light and dark backgrounds

---

### **assets/icons/icon-180.png**
**Purpose:** iOS home screen icon (primary)  
**Specifications:**
- Size: 180x180px (iPhone retina)
- Format: PNG, no transparency (iOS adds rounded corners)
- Content: Same logo, optimized for iOS
- Used by: manifest.json, Apple touch icon
**Requirements:**
- No transparency (iOS renders black background if present)
- Full bleed (iOS applies mask)
- High quality (displayed prominently)

---

### **assets/icons/icon-512.png**
**Purpose:** High-resolution icon for splash screens, app store  
**Specifications:**
- Size: 512x512px
- Format: PNG with transparency
- Content: Logo with optional background
- Used by: manifest.json, splash screens
**Requirements:**
- Scalable quality
- Works for splash screen generation
- Future-proof for higher DPI displays

---

### **assets/icons/background.png** (User-provided)
**Purpose:** Background image for splash screen or UI accents  
**Specifications:**
- Size: Flexible (recommend 1920x1080 or higher)
- Format: PNG or WEBP
- Content: User's background image
- Used by: UI themes, splash screen
**Optimization:**
- Compress for web (target <200KB)
- Responsive scaling
- Optional blur/overlay for readability

---

### **assets/styles/base.css**
**Purpose:** Core system styles and CSS variables  
**Contains:**
- **CSS Variables (Design tokens):**
  ```css
  :root {
    /* Colors */
    --color-bg-primary: #0a0a0a;
    --color-bg-secondary: #1a1a1a;
    --color-text-primary: #e0e0e0;
    --color-text-secondary: #a0a0a0;
    --color-accent: #00ff88;
    --color-error: #ff4444;
    --color-warning: #ffaa00;
    --color-success: #00ff88;
    
    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    
    /* Typography */
    --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-family-mono: 'SF Mono', Monaco, 'Courier New', monospace;
    --font-size-xs: 12px;
    --font-size-sm: 14px;
    --font-size-base: 16px;
    --font-size-lg: 18px;
    --font-size-xl: 24px;
    
    /* Layout */
    --header-height: 60px;
    --footer-height: 60px;
    --sidebar-width: 300px;
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
    --transition-slow: 400ms ease;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.3);
    --shadow-lg: 0 10px 20px rgba(0,0,0,0.4);
    
    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
  }
  ```
- **Reset/Normalize:**
  - Box-sizing: border-box on all elements
  - Remove default margins/padding
  - Consistent line-height
- **Base styles:**
  - Body: font, background, color
  - Links: no underline, accent color on hover
  - Buttons: reset default styles
  - Inputs: consistent appearance
- **Utility classes:**
  - `.hidden`: display: none
  - `.flex`: display: flex
  - `.grid`: display: grid
  - `.container`: max-width, centering
**Key Behaviors:**
- Mobile-first (min-width media queries)
- Dark theme by default
- Light theme via `[data-theme="light"]` on body
- Accessible (WCAG AA contrast ratios)

---

### **assets/styles/chat.css**
**Purpose:** Chat interface specific styles  
**Contains:**
- **Chat container:**
  ```css
  #chat {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
  }
  
  #input-area {
    display: flex;
    padding: var(--space-md);
    border-top: 1px solid var(--color-bg-secondary);
  }
  ```
- **Message bubbles:**
  - User messages: right-aligned, accent color
  - System messages: left-aligned, secondary color
  - Timestamps: small, muted
  - Code blocks: monospace font, syntax highlighting
- **Input styling:**
  - Textarea with auto-resize
  - Send button with hover states
  - Typing indicator animation (animated dots)
- **Markdown rendering:**
  - Headings, lists, bold/italic
  - Code inline and blocks
  - Links with accent color
**Responsive:**
- Mobile: full width messages
- Desktop: max-width bubbles, better spacing

---

### **assets/styles/inspector.css**
**Purpose:** Developer inspector panel styles  
**Contains:**
- **Inspector layout:**
  ```css
  #inspector {
    position: fixed;
    right: 0;
    top: var(--header-height);
    width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    background: var(--color-bg-secondary);
    transform: translateX(100%);
    transition: transform var(--transition-base);
  }
  
  #inspector.open {
    transform: translateX(0);
  }
  ```
- **Tab navigation:**
  - Horizontal tabs: Memory, Goals, Trace, Performance
  - Active tab highlight
  - Smooth tab switching
- **Panel content:**
  - Memory list: scrollable, searchable
  - Goal queue: color-coded priority
  - Trace viewer: tree/timeline view
  - Performance charts: canvas/SVG graphs
- **Collapsible sections:**
  - Accordion behavior
  - Smooth expand/collapse animations
**Mobile behavior:**
- Full-screen overlay on mobile
- Swipe to close
- Bottom sheet style

---

### **assets/fonts/** (Optional)
**Purpose:** Custom fonts if needed  
**Recommendation:**
- Use system fonts (faster, no download)
- If custom font needed:
  - WOFF2 format (best compression)
  - Subset to Latin characters only
  - Font-display: swap (FOUT acceptable)
  - Preload critical font files
**Alternative:**
- Google Fonts API with `&display=swap`
- Only if specific branding needed

---

