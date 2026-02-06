/**
 * CSA.OS - Task Scheduler
 * Advanced task scheduling and execution management
 * Optimizes for hardware constraints and priority
 */

import hardware from './hardware.js';
import storage from './storage.js';

class TaskScheduler {
    constructor() {
        this.queue = [];
        this.running = new Map();
        this.completed = [];
        this.failed = [];
        this.maxConcurrent = navigator.hardwareConcurrency || 4;
        this.isRunning = false;
        this.scheduleInterval = null;
    }

    async initialize() {
        console.log('[Scheduler] Initializing task scheduler...');
        
        // Load pending tasks from storage
        const pendingTasks = await storage.getPendingTasks();
        this.queue = pendingTasks || [];
        
        console.log(`[Scheduler] Loaded ${this.queue.length} pending tasks`);
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('[Scheduler] Starting scheduler...');
        
        // Run scheduler every 100ms
        this.scheduleInterval = setInterval(() => {
            this.schedule();
        }, 100);
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.scheduleInterval) {
            clearInterval(this.scheduleInterval);
            this.scheduleInterval = null;
        }
        
        console.log('[Scheduler] Stopped scheduler');
    }

    async addTask(task) {
        const enrichedTask = {
            ...task,
            id: task.id || this.generateTaskId(),
            status: 'pending',
            priority: task.priority || 5,
            created: Date.now(),
            attempts: 0,
            maxAttempts: task.maxAttempts || 3
        };

        this.queue.push(enrichedTask);
        await storage.addTask(enrichedTask);
        
        console.log(`[Scheduler] Added task: ${enrichedTask.id}`);
        
        // Try to schedule immediately
        if (this.isRunning) {
            this.schedule();
        }
        
        return enrichedTask.id;
    }

    async schedule() {
        // Don't schedule if at max capacity
        if (this.running.size >= this.maxConcurrent) {
            return;
        }

        // Get system resources
        const metrics = hardware.getAllMetrics();
        const memoryUsage = parseFloat(metrics.memory.percentage);
        
        // Don't schedule if system is under pressure
        if (memoryUsage > 90) {
            console.warn('[Scheduler] Memory pressure detected, pausing scheduling');
            return;
        }

        // Sort queue by priority
        this.queue.sort((a, b) => b.priority - a.priority);

        // Find tasks to execute
        const availableSlots = this.maxConcurrent - this.running.size;
        const tasksToRun = this.queue.splice(0, availableSlots);

        for (const task of tasksToRun) {
            this.executeTask(task);
        }
    }

    async executeTask(task) {
        task.status = 'running';
        task.startTime = Date.now();
        task.attempts++;
        
        this.running.set(task.id, task);
        await storage.addTask(task);
        
        console.log(`[Scheduler] Executing task: ${task.id}`);

        try {
            const result = await this.runTask(task);
            await this.handleSuccess(task, result);
        } catch (error) {
            await this.handleFailure(task, error);
        }
    }

    async runTask(task) {
        // Simulate task execution
        // In real implementation, this would delegate to agent runtime
        return new Promise((resolve, reject) => {
            const duration = Math.random() * 1000 + 100;
            
            setTimeout(() => {
                if (Math.random() > 0.9) {
                    reject(new Error('Task failed randomly'));
                } else {
                    resolve({
                        success: true,
                        data: task.data,
                        duration
                    });
                }
            }, duration);
        });
    }

    async handleSuccess(task, result) {
        task.status = 'completed';
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;
        task.result = result;
        
        this.running.delete(task.id);
        this.completed.push(task);
        
        await storage.addTask(task);
        
        console.log(`[Scheduler] Task completed: ${task.id} (${task.duration}ms)`);
        
        // Trigger callback if provided
        if (task.onSuccess) {
            task.onSuccess(result);
        }
    }

    async handleFailure(task, error) {
        console.error(`[Scheduler] Task failed: ${task.id}`, error);
        
        this.running.delete(task.id);
        
        // Retry if under max attempts
        if (task.attempts < task.maxAttempts) {
            console.log(`[Scheduler] Retrying task: ${task.id} (attempt ${task.attempts + 1}/${task.maxAttempts})`);
            
            task.status = 'pending';
            task.retryDelay = Math.pow(2, task.attempts) * 1000; // Exponential backoff
            
            // Add back to queue after delay
            setTimeout(() => {
                this.queue.push(task);
            }, task.retryDelay);
            
        } else {
            task.status = 'failed';
            task.endTime = Date.now();
            task.error = error.message;
            
            this.failed.push(task);
            await storage.addTask(task);
            
            // Trigger callback if provided
            if (task.onFailure) {
                task.onFailure(error);
            }
        }
    }

    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getStats() {
        return {
            queued: this.queue.length,
            running: this.running.size,
            completed: this.completed.length,
            failed: this.failed.length,
            totalProcessed: this.completed.length + this.failed.length,
            successRate: this.completed.length / (this.completed.length + this.failed.length) || 0
        };
    }

    getTask(id) {
        // Check running
        if (this.running.has(id)) {
            return this.running.get(id);
        }
        
        // Check queue
        const queued = this.queue.find(t => t.id === id);
        if (queued) return queued;
        
        // Check completed
        const completed = this.completed.find(t => t.id === id);
        if (completed) return completed;
        
        // Check failed
        const failed = this.failed.find(t => t.id === id);
        if (failed) return failed;
        
        return null;
    }

    cancelTask(id) {
        // Remove from queue
        const queueIndex = this.queue.findIndex(t => t.id === id);
        if (queueIndex !== -1) {
            const task = this.queue.splice(queueIndex, 1)[0];
            task.status = 'cancelled';
            console.log(`[Scheduler] Cancelled task: ${id}`);
            return true;
        }
        
        // Can't cancel running tasks (for now)
        if (this.running.has(id)) {
            console.warn(`[Scheduler] Cannot cancel running task: ${id}`);
            return false;
        }
        
        return false;
    }

    clearCompleted() {
        const count = this.completed.length;
        this.completed = [];
        console.log(`[Scheduler] Cleared ${count} completed tasks`);
    }

    clearFailed() {
        const count = this.failed.length;
        this.failed = [];
        console.log(`[Scheduler] Cleared ${count} failed tasks`);
    }

    // Priority adjustment
    adjustPriority(id, newPriority) {
        const task = this.queue.find(t => t.id === id);
        if (task) {
            task.priority = newPriority;
            console.log(`[Scheduler] Adjusted priority for task ${id}: ${newPriority}`);
            return true;
        }
        return false;
    }

    // Batch operations
    async addBatch(tasks) {
        const ids = [];
        for (const task of tasks) {
            const id = await this.addTask(task);
            ids.push(id);
        }
        return ids;
    }

    // Get tasks by status
    getTasksByStatus(status) {
        switch (status) {
            case 'pending':
                return [...this.queue];
            case 'running':
                return Array.from(this.running.values());
            case 'completed':
                return [...this.completed];
            case 'failed':
                return [...this.failed];
            default:
                return [];
        }
    }

    // Performance analytics
    getPerformanceMetrics() {
        const completedTasks = this.completed;
        
        if (completedTasks.length === 0) {
            return {
                avgDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                totalDuration: 0
            };
        }

        const durations = completedTasks.map(t => t.duration);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        
        return {
            avgDuration: totalDuration / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            totalDuration,
            tasksPerSecond: (completedTasks.length / (totalDuration / 1000)).toFixed(2)
        };
    }
}

const scheduler = new TaskScheduler();

export default scheduler;
export { TaskScheduler };
