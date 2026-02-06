/**
 * CSA.OS - Agent Runtime
 * Lightweight agent execution system with zero dependencies
 * Manages agent lifecycle, communication, and execution
 */

import storage from './storage.js';

class Agent {
    constructor(id, config = {}) {
        this.id = id;
        this.name = config.name || `Agent-${id}`;
        this.status = 'idle';
        this.created = Date.now();
        this.lastActive = Date.now();
        this.memory = new Map();
        this.worker = null;
        this.config = config;
    }

    async initialize() {
        this.status = 'initializing';
        await this.persist();
        this.status = 'ready';
        await this.persist();
    }

    async execute(task) {
        this.status = 'running';
        this.lastActive = Date.now();
        await this.persist();

        try {
            const result = await this.processTask(task);
            this.status = 'idle';
            await this.persist();
            return result;
        } catch (error) {
            this.status = 'error';
            await this.persist();
            throw error;
        }
    }

    async processTask(task) {
        // Placeholder for task processing logic
        // Will be extended with actual agent intelligence
        return {
            success: true,
            task: task,
            timestamp: Date.now()
        };
    }

    async remember(key, value) {
        this.memory.set(key, value);
        await storage.saveMemory(this.id, {
            key,
            value,
            timestamp: Date.now()
        });
    }

    recall(key) {
        return this.memory.get(key);
    }

    async persist() {
        await storage.saveAgent({
            id: this.id,
            name: this.name,
            status: this.status,
            created: this.created,
            lastActive: this.lastActive,
            config: this.config
        });
    }

    async terminate() {
        this.status = 'terminated';
        await this.persist();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

class AgentRuntime {
    constructor() {
        this.agents = new Map();
        this.workerPool = [];
        this.maxWorkers = navigator.hardwareConcurrency || 4;
        this.messageHandlers = new Map();
        this.initialized = false;
    }

    async initialize() {
        console.log('[AgentRuntime] Initializing...');
        
        // Load existing agents from storage
        const savedAgents = await storage.getAllAgents();
        for (const agentData of savedAgents) {
            if (agentData.status !== 'terminated') {
                const agent = new Agent(agentData.id, agentData.config);
                Object.assign(agent, agentData);
                this.agents.set(agent.id, agent);
            }
        }

        console.log(`[AgentRuntime] Loaded ${this.agents.size} agents`);
        this.initialized = true;
    }

    async createAgent(config = {}) {
        const id = this.generateAgentId();
        const agent = new Agent(id, config);
        await agent.initialize();
        
        this.agents.set(id, agent);
        console.log(`[AgentRuntime] Created agent: ${id}`);
        
        return agent;
    }

    getAgent(id) {
        return this.agents.get(id);
    }

    getAllAgents() {
        return Array.from(this.agents.values());
    }

    getActiveAgents() {
        return this.getAllAgents().filter(a => a.status === 'running' || a.status === 'ready');
    }

    async executeTask(agentId, task) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        return await agent.execute(task);
    }

    async terminateAgent(id) {
        const agent = this.agents.get(id);
        if (agent) {
            await agent.terminate();
            this.agents.delete(id);
            console.log(`[AgentRuntime] Terminated agent: ${id}`);
        }
    }

    async terminateAllAgents() {
        for (const agent of this.agents.values()) {
            await agent.terminate();
        }
        this.agents.clear();
        console.log('[AgentRuntime] All agents terminated');
    }

    generateAgentId() {
        return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Worker pool management
    async createWorker(script) {
        if (!('Worker' in window)) {
            throw new Error('Web Workers not supported');
        }

        const worker = new Worker(script);
        this.workerPool.push(worker);
        
        worker.onmessage = (event) => {
            this.handleWorkerMessage(event.data);
        };

        worker.onerror = (error) => {
            console.error('[AgentRuntime] Worker error:', error);
        };

        return worker;
    }

    handleWorkerMessage(data) {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        }
    }

    registerMessageHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    // System stats
    getStats() {
        return {
            totalAgents: this.agents.size,
            activeAgents: this.getActiveAgents().length,
            maxWorkers: this.maxWorkers,
            workers: this.workerPool.length
        };
    }
}

const runtime = new AgentRuntime();

export default runtime;
export { AgentRuntime, Agent };
