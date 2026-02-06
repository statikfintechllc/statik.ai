/**
 * CSA.OS - Hardware Monitor
 * System-level hardware and performance monitoring
 * Direct access to CPU, memory, GPU metrics
 */

class HardwareMonitor {
    constructor() {
        this.metrics = {
            cpu: { cores: 0, usage: [] },
            memory: { total: 0, used: 0, limit: 0 },
            storage: { used: 0, quota: 0 },
            performance: { fps: 0, latency: 0 },
            gpu: { supported: false, vendor: '', renderer: '' }
        };
        
        this.monitoring = false;
        this.monitoringInterval = null;
        this.performanceObserver = null;
    }

    async initialize() {
        console.log('[Hardware] Initializing hardware monitor...');
        
        this.detectCPU();
        this.detectMemory();
        await this.detectStorage();
        this.detectGPU();
        this.setupPerformanceMonitoring();
        
        console.log('[Hardware] Hardware monitor initialized');
    }

    detectCPU() {
        this.metrics.cpu.cores = navigator.hardwareConcurrency || 4;
        console.log(`[Hardware] CPU cores: ${this.metrics.cpu.cores}`);
    }

    detectMemory() {
        if ('deviceMemory' in navigator) {
            this.metrics.memory.total = navigator.deviceMemory;
            console.log(`[Hardware] Device memory: ${navigator.deviceMemory} GB`);
        }

        if ('memory' in performance) {
            const mem = performance.memory;
            this.metrics.memory.limit = mem.jsHeapSizeLimit;
            this.metrics.memory.used = mem.usedJSHeapSize;
            console.log(`[Hardware] JS Heap: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ${(mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
        }
    }

    async detectStorage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            this.metrics.storage.used = estimate.usage;
            this.metrics.storage.quota = estimate.quota;
            
            console.log(`[Hardware] Storage: ${(estimate.usage / 1024 / 1024 / 1024).toFixed(2)} GB / ${(estimate.quota / 1024 / 1024 / 1024).toFixed(2)} GB`);
        }
    }

    detectGPU() {
        // Try WebGL
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    this.metrics.gpu.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    this.metrics.gpu.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    this.metrics.gpu.supported = true;
                }
            }
        } catch (error) {
            console.warn('[Hardware] GPU detection failed:', error);
        }

        // Check for WebGPU
        if ('gpu' in navigator) {
            this.metrics.gpu.webgpu = true;
            console.log('[Hardware] WebGPU supported');
        }

        if (this.metrics.gpu.supported) {
            console.log(`[Hardware] GPU: ${this.metrics.gpu.vendor} - ${this.metrics.gpu.renderer}`);
        }
    }

    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            try {
                this.performanceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'measure') {
                            this.metrics.performance.latency = entry.duration;
                        }
                    }
                });
                
                this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
            } catch (error) {
                console.warn('[Hardware] PerformanceObserver setup failed:', error);
            }
        }
    }

    startMonitoring(interval = 1000) {
        if (this.monitoring) return;
        
        this.monitoring = true;
        console.log('[Hardware] Started continuous monitoring');
        
        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
        }, interval);
    }

    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('[Hardware] Stopped monitoring');
    }

    async updateMetrics() {
        // Update memory metrics
        if ('memory' in performance) {
            const mem = performance.memory;
            this.metrics.memory.used = mem.usedJSHeapSize;
            this.metrics.memory.limit = mem.jsHeapSizeLimit;
        }

        // Update storage metrics
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            this.metrics.storage.used = estimate.usage;
            this.metrics.storage.quota = estimate.quota;
        }

        // Calculate CPU usage approximation (based on event loop lag)
        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 0));
        const lag = performance.now() - start;
        
        this.metrics.cpu.usage.push(lag);
        if (this.metrics.cpu.usage.length > 60) {
            this.metrics.cpu.usage.shift();
        }
    }

    getCPUMetrics() {
        return {
            cores: this.metrics.cpu.cores,
            avgLag: this.metrics.cpu.usage.length > 0 
                ? this.metrics.cpu.usage.reduce((a, b) => a + b, 0) / this.metrics.cpu.usage.length 
                : 0
        };
    }

    getMemoryMetrics() {
        return {
            deviceMemory: this.metrics.memory.total,
            jsHeapUsed: this.metrics.memory.used,
            jsHeapLimit: this.metrics.memory.limit,
            usedMB: (this.metrics.memory.used / 1024 / 1024).toFixed(2),
            limitMB: (this.metrics.memory.limit / 1024 / 1024).toFixed(2),
            percentage: this.metrics.memory.limit > 0 
                ? ((this.metrics.memory.used / this.metrics.memory.limit) * 100).toFixed(2)
                : 0
        };
    }

    getStorageMetrics() {
        return {
            used: this.metrics.storage.used,
            quota: this.metrics.storage.quota,
            usedGB: (this.metrics.storage.used / 1024 / 1024 / 1024).toFixed(2),
            quotaGB: (this.metrics.storage.quota / 1024 / 1024 / 1024).toFixed(2),
            percentage: this.metrics.storage.quota > 0
                ? ((this.metrics.storage.used / this.metrics.storage.quota) * 100).toFixed(2)
                : 0
        };
    }

    getGPUMetrics() {
        return this.metrics.gpu;
    }

    getAllMetrics() {
        return {
            cpu: this.getCPUMetrics(),
            memory: this.getMemoryMetrics(),
            storage: this.getStorageMetrics(),
            gpu: this.getGPUMetrics(),
            timestamp: Date.now()
        };
    }

    // Performance measurement utilities
    mark(name) {
        performance.mark(name);
    }

    measure(name, startMark, endMark) {
        try {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name)[0];
            return measure.duration;
        } catch (error) {
            console.warn(`[Hardware] Measurement failed: ${error.message}`);
            return 0;
        }
    }

    clearMarks() {
        performance.clearMarks();
        performance.clearMeasures();
    }

    // Resource hints for browser optimization
    preconnect(url) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        document.head.appendChild(link);
    }

    prefetch(url) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    }
}

const hardware = new HardwareMonitor();

export default hardware;
export { HardwareMonitor };
