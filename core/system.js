/**
 * CSA.OS - Core System Module
 * System-level access interface for iOS Developer Mode
 * Zero external dependencies - Pure vanilla JavaScript
 */

class SystemCore {
    constructor() {
        this.capabilities = new Map();
        this.initialized = false;
        this.console = [];
    }

    async initialize() {
        this.log('System initialization started...', 'success');
        
        await this.detectCapabilities();
        await this.initializeStorage();
        await this.registerServiceWorker();
        await this.initializeWorkers();
        
        this.initialized = true;
        this.log('System initialization complete', 'success');
        
        return this.capabilities;
    }

    async detectCapabilities() {
        this.log('Detecting system capabilities...', 'info');
        
        // Core Web Platform Features
        this.checkCapability('Service Worker', 'serviceWorker' in navigator);
        this.checkCapability('Web Workers', typeof Worker !== 'undefined');
        this.checkCapability('SharedArrayBuffer', typeof SharedArrayBuffer !== 'undefined');
        this.checkCapability('WebAssembly', typeof WebAssembly !== 'undefined');
        this.checkCapability('WebAssembly Threads', this.checkWasmThreads());
        
        // Storage APIs
        this.checkCapability('IndexedDB', 'indexedDB' in window);
        this.checkCapability('Cache API', 'caches' in window);
        this.checkCapability('Storage Manager', 'storage' in navigator);
        this.checkCapability('File System Access', 'storage' in navigator && 'getDirectory' in navigator.storage);
        
        // Performance & Hardware APIs
        this.checkCapability('Performance API', 'performance' in window);
        this.checkCapability('Hardware Concurrency', 'hardwareConcurrency' in navigator);
        this.checkCapability('Device Memory', 'deviceMemory' in navigator);
        
        // Background & Sync APIs
        this.checkCapability('Background Sync', 'sync' in ServiceWorkerRegistration.prototype);
        this.checkCapability('Periodic Background Sync', 'periodicSync' in ServiceWorkerRegistration.prototype);
        
        // Graphics & Compute
        this.checkCapability('WebGL', this.checkWebGL());
        this.checkCapability('WebGL2', this.checkWebGL2());
        this.checkCapability('WebGPU', 'gpu' in navigator);
        this.checkCapability('OffscreenCanvas', typeof OffscreenCanvas !== 'undefined');
        
        // Advanced Features
        this.checkCapability('Web Locks', 'locks' in navigator);
        this.checkCapability('Atomics', typeof Atomics !== 'undefined');
        this.checkCapability('Notification', 'Notification' in window);
        
        this.log(`Detected ${this.capabilities.size} capabilities`, 'success');
    }

    checkCapability(name, available) {
        this.capabilities.set(name, available);
        const status = available ? '✓' : '✗';
        this.log(`  ${status} ${name}`, available ? 'success' : 'warning');
    }

    checkWasmThreads() {
        try {
            return typeof WebAssembly !== 'undefined' && 
                   typeof SharedArrayBuffer !== 'undefined' &&
                   typeof Atomics !== 'undefined';
        } catch {
            return false;
        }
    }

    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
            return false;
        }
    }

    checkWebGL2() {
        try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('webgl2');
        } catch {
            return false;
        }
    }

    async initializeStorage() {
        this.log('Initializing storage systems...', 'info');
        
        if ('storage' in navigator && 'persist' in navigator.storage) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                const result = await navigator.storage.persist();
                this.log(`Storage persistence: ${result ? 'granted' : 'denied'}`, result ? 'success' : 'warning');
            } else {
                this.log('Storage persistence: already granted', 'success');
            }
        }
        
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usedGB = (estimate.usage / (1024 ** 3)).toFixed(2);
            const quotaGB = (estimate.quota / (1024 ** 3)).toFixed(2);
            this.log(`Storage: ${usedGB}GB used / ${quotaGB}GB available`, 'info');
        }
        
        // Initialize OPFS if available
        if ('storage' in navigator && 'getDirectory' in navigator.storage) {
            try {
                const root = await navigator.storage.getDirectory();
                this.log('Origin Private File System initialized', 'success');
                this.capabilities.set('OPFS Root', root);
            } catch (error) {
                this.log(`OPFS initialization failed: ${error.message}`, 'error');
            }
        }
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            this.log('Service Worker not supported', 'warning');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            });
            
            this.log('Service Worker registered', 'success');
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            this.log('Service Worker ready', 'success');
            
            // Check for updates periodically
            setInterval(() => registration.update(), 60000);
            
        } catch (error) {
            this.log(`Service Worker registration failed: ${error.message}`, 'error');
        }
    }

    async initializeWorkers() {
        this.log('Initializing worker pool...', 'info');
        
        const coreCount = navigator.hardwareConcurrency || 4;
        this.log(`CPU cores available: ${coreCount}`, 'info');
        
        // We'll create workers on-demand in the agent system
        this.capabilities.set('CPU Cores', coreCount);
    }

    getSystemInfo() {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 'unknown',
            memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown',
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : 'unknown',
            language: navigator.language,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio
            }
        };
        
        return info;
    }

    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                usageGB: (estimate.usage / (1024 ** 3)).toFixed(2),
                quotaGB: (estimate.quota / (1024 ** 3)).toFixed(2),
                percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }

    async getPerformanceMetrics() {
        if (!('performance' in window)) return null;
        
        const perf = window.performance;
        const memory = perf.memory || {};
        
        return {
            navigation: perf.getEntriesByType('navigation')[0] || {},
            memory: {
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                totalJSHeapSize: memory.totalJSHeapSize,
                usedJSHeapSize: memory.usedJSHeapSize
            },
            timing: {
                loadTime: perf.timing ? perf.timing.loadEventEnd - perf.timing.navigationStart : 0,
                domReady: perf.timing ? perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart : 0
            }
        };
    }

    log(message, type = 'info') {
        const entry = {
            timestamp: Date.now(),
            message,
            type
        };
        this.console.push(entry);
        console.log(`[CSA.OS] ${message}`);
        
        // Emit to UI if available
        if (typeof window !== 'undefined' && window.updateConsole) {
            window.updateConsole(entry);
        }
    }

    isCapabilityAvailable(name) {
        return this.capabilities.get(name) === true;
    }

    getAllCapabilities() {
        return Object.fromEntries(this.capabilities);
    }
}

// Export singleton instance
const system = new SystemCore();

export default system;
export { SystemCore };
