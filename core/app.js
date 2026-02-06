/**
 * CSA.OS - Main Application
 * Initializes and orchestrates all system components
 */

import system from './system.js';
import storage from './storage.js';
import runtime from './agent.js';
import hardware from './hardware.js';
import scheduler from './scheduler.js';

class Application {
    constructor() {
        this.initialized = false;
        this.ui = {
            systemStatus: null,
            devModeStatus: null,
            storageAvailable: null,
            cpuCores: null,
            deviceMemory: null,
            activeAgents: null,
            capabilitiesList: null,
            console: null
        };
    }

    async initialize() {
        console.log('[App] Starting CSA.OS...');
        this.initializeUI();
        
        try {
            // Initialize core systems
            await system.initialize();
            await storage.initialize();
            await hardware.initialize();
            await runtime.initialize();
            await scheduler.initialize();
            
            // Start background services
            hardware.startMonitoring(2000);
            scheduler.start();
            
            // Update UI
            this.updateDashboard();
            
            // Set up periodic updates
            setInterval(() => this.updateDashboard(), 3000);
            
            this.initialized = true;
            this.logToConsole('CSA.OS initialized successfully', 'success');
            this.logToConsole('System ready for agent deployment', 'success');
            
            // Check for Developer Mode indicators
            this.checkDeveloperMode();
            
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            this.logToConsole(`Initialization failed: ${error.message}`, 'error');
        }
    }

    initializeUI() {
        this.ui.systemStatus = document.getElementById('system-status');
        this.ui.devModeStatus = document.getElementById('dev-mode-status');
        this.ui.systemStatusText = document.getElementById('system-status-text');
        this.ui.devModeText = document.getElementById('dev-mode-text');
        this.ui.storageAvailable = document.getElementById('storage-available');
        this.ui.cpuCores = document.getElementById('cpu-cores');
        this.ui.deviceMemory = document.getElementById('device-memory');
        this.ui.activeAgents = document.getElementById('active-agents');
        this.ui.capabilitiesList = document.getElementById('capabilities-list');
        this.ui.console = document.getElementById('console');
    }

    async updateDashboard() {
        // System status
        if (this.ui.systemStatus) {
            this.ui.systemStatus.className = 'status-indicator active';
            this.ui.systemStatusText.textContent = 'Online';
        }

        // Storage info
        const storageInfo = await storage.getStats();
        if (storageInfo && this.ui.storageAvailable) {
            this.ui.storageAvailable.textContent = `${storageInfo.quotaGB} GB`;
        }

        // CPU info
        const cpuMetrics = hardware.getCPUMetrics();
        if (this.ui.cpuCores) {
            this.ui.cpuCores.textContent = cpuMetrics.cores;
        }

        // Memory info
        const memoryMetrics = hardware.getMemoryMetrics();
        if (this.ui.deviceMemory) {
            const memory = memoryMetrics.deviceMemory || 'N/A';
            this.ui.deviceMemory.textContent = memory !== 'N/A' ? `${memory} GB` : memory;
        }

        // Active agents
        const stats = runtime.getStats();
        if (this.ui.activeAgents) {
            this.ui.activeAgents.textContent = stats.activeAgents;
        }

        // Update capabilities
        this.updateCapabilities();
    }

    updateCapabilities() {
        if (!this.ui.capabilitiesList) return;

        const capabilities = system.getAllCapabilities();
        const html = Object.entries(capabilities)
            .map(([name, available]) => {
                const status = available ? '✓' : '✗';
                const className = available ? 'success' : 'warning';
                return `<div class="feature-check"><span class="console-line ${className}">${status} ${name}</span></div>`;
            })
            .join('');

        this.ui.capabilitiesList.innerHTML = html;
    }

    checkDeveloperMode() {
        // Detect potential Developer Mode features
        const advancedFeatures = [
            'SharedArrayBuffer' in window,
            'storage' in navigator && 'getDirectory' in navigator.storage,
            'gpu' in navigator,
            typeof Atomics !== 'undefined'
        ];

        const enabledCount = advancedFeatures.filter(f => f).length;
        const isLikelyDevMode = enabledCount >= 2;

        if (this.ui.devModeStatus) {
            this.ui.devModeStatus.className = `status-indicator ${isLikelyDevMode ? 'active' : 'inactive'}`;
            this.ui.devModeText.textContent = isLikelyDevMode ? 'Detected' : 'Not Detected';
        }

        if (isLikelyDevMode) {
            this.logToConsole('Advanced features detected - Developer Mode likely enabled', 'success');
        } else {
            this.logToConsole('Limited features - Enable Developer Mode for full capabilities', 'warning');
            this.logToConsole('Settings → Privacy & Security → Developer Mode', 'info');
        }
    }

    logToConsole(message, type = 'info') {
        if (!this.ui.console) return;

        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        this.ui.console.appendChild(line);
        this.ui.console.scrollTop = this.ui.console.scrollHeight;

        // Limit console lines
        while (this.ui.console.children.length > 100) {
            this.ui.console.removeChild(this.ui.console.firstChild);
        }
    }

    async createTestAgent() {
        try {
            const agent = await runtime.createAgent({
                name: 'Test Agent',
                type: 'test'
            });

            this.logToConsole(`Created agent: ${agent.id}`, 'success');
            
            const result = await runtime.executeTask(agent.id, {
                type: 'echo',
                message: 'Hello from CSA.OS'
            });

            this.logToConsole(`Agent executed task: ${JSON.stringify(result)}`, 'info');
            this.updateDashboard();
            
            return agent;
        } catch (error) {
            this.logToConsole(`Failed to create agent: ${error.message}`, 'error');
        }
    }

    getSystemInfo() {
        return {
            system: system.getSystemInfo(),
            hardware: hardware.getAllMetrics(),
            storage: storage.getStats(),
            runtime: runtime.getStats(),
            capabilities: system.getAllCapabilities()
        };
    }
}

// Global console update function for system.js
window.updateConsole = (entry) => {
    if (window.app) {
        window.app.logToConsole(entry.message, entry.type);
    }
};

// Initialize application
const app = new Application();
window.app = app;

// Start on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Expose to window for debugging
window.CSA = {
    app,
    system,
    storage,
    hardware,
    runtime,
    scheduler,
    
    // Utility functions
    info: () => app.getSystemInfo(),
    createAgent: () => app.createTestAgent(),
    getAgents: () => runtime.getAllAgents(),
    getMetrics: () => hardware.getAllMetrics()
};

console.log('[CSA.OS] Client Side Agent Operating System loaded');
console.log('[CSA.OS] Access via window.CSA for debugging');

export default app;
export { Application };
