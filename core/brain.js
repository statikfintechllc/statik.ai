/**
 * CSA.OS - Agent Intelligence Module
 * Lightweight decision-making and task processing
 * Zero external dependencies - Pure algorithmic intelligence
 */

class AgentBrain {
    constructor(agentId) {
        this.agentId = agentId;
        this.knowledge = new Map();
        this.taskHistory = [];
        this.patterns = new Map();
        this.decisionTree = null;
    }

    // Process and analyze task
    analyzeTask(task) {
        const analysis = {
            type: task.type || 'unknown',
            complexity: this.estimateComplexity(task),
            priority: task.priority || 5,
            estimatedTime: this.estimateTime(task),
            requiredResources: this.estimateResources(task),
            dependencies: task.dependencies || [],
            strategy: null
        };

        analysis.strategy = this.selectStrategy(analysis);
        return analysis;
    }

    // Estimate task complexity (0-10 scale)
    estimateComplexity(task) {
        let complexity = 1;
        
        if (task.data) {
            const dataSize = JSON.stringify(task.data).length;
            complexity += Math.log10(dataSize + 1);
        }
        
        if (task.dependencies && task.dependencies.length > 0) {
            complexity += task.dependencies.length * 0.5;
        }
        
        if (task.subtasks && task.subtasks.length > 0) {
            complexity += task.subtasks.length;
        }
        
        return Math.min(10, Math.max(1, Math.round(complexity)));
    }

    // Estimate execution time in milliseconds
    estimateTime(task) {
        const complexity = this.estimateComplexity(task);
        const baseTime = 10; // 10ms base
        return baseTime * Math.pow(2, complexity / 3);
    }

    // Estimate required resources
    estimateResources(task) {
        return {
            memory: this.estimateMemory(task),
            cpu: this.estimateCPU(task),
            storage: this.estimateStorage(task),
            network: task.requiresNetwork || false
        };
    }

    estimateMemory(task) {
        const dataSize = task.data ? JSON.stringify(task.data).length : 0;
        return Math.max(1024, dataSize * 2); // Bytes
    }

    estimateCPU(task) {
        return this.estimateComplexity(task) / 10; // 0-1 scale
    }

    estimateStorage(task) {
        return task.persist ? this.estimateMemory(task) * 10 : 0;
    }

    // Select execution strategy
    selectStrategy(analysis) {
        if (analysis.complexity < 3) {
            return 'immediate';
        } else if (analysis.complexity < 6) {
            return 'worker';
        } else {
            return 'distributed';
        }
    }

    // Decision making
    makeDecision(options, context) {
        const scored = options.map(option => ({
            option,
            score: this.scoreOption(option, context)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored[0].option;
    }

    scoreOption(option, context) {
        let score = 0;
        
        // Score based on expected success
        score += (option.successProbability || 0.5) * 100;
        
        // Score based on resource efficiency
        const resourceCost = (option.memoryCost || 1) + (option.cpuCost || 1);
        score -= resourceCost * 10;
        
        // Score based on time efficiency
        score -= (option.timeCost || 1);
        
        // Score based on context relevance
        if (context.priority === 'high') {
            score += (option.speed || 1) * 20;
        }
        
        return score;
    }

    // Pattern recognition
    recognizePattern(data) {
        // Simple pattern matching based on data characteristics
        const signature = this.createSignature(data);
        
        for (const [pattern, handler] of this.patterns) {
            if (this.matchesPattern(signature, pattern)) {
                return handler;
            }
        }
        
        return null;
    }

    createSignature(data) {
        if (typeof data === 'string') {
            return {
                type: 'string',
                length: data.length,
                hash: this.simpleHash(data)
            };
        } else if (Array.isArray(data)) {
            return {
                type: 'array',
                length: data.length,
                elementType: typeof data[0]
            };
        } else if (typeof data === 'object') {
            return {
                type: 'object',
                keys: Object.keys(data).sort(),
                size: Object.keys(data).length
            };
        }
        
        return { type: typeof data };
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    matchesPattern(signature, pattern) {
        if (signature.type !== pattern.type) return false;
        
        if (pattern.lengthRange) {
            const [min, max] = pattern.lengthRange;
            if (signature.length < min || signature.length > max) return false;
        }
        
        return true;
    }

    registerPattern(pattern, handler) {
        this.patterns.set(pattern, handler);
    }

    // Learning from execution
    learn(task, result, duration) {
        this.taskHistory.push({
            task,
            result,
            duration,
            timestamp: Date.now()
        });

        // Keep history limited
        if (this.taskHistory.length > 1000) {
            this.taskHistory.shift();
        }

        // Update knowledge
        this.updateKnowledge(task, result, duration);
    }

    updateKnowledge(task, result, duration) {
        const key = `${task.type}:complexity:${this.estimateComplexity(task)}`;
        
        if (!this.knowledge.has(key)) {
            this.knowledge.set(key, {
                executions: 0,
                totalDuration: 0,
                successes: 0,
                failures: 0
            });
        }

        const knowledge = this.knowledge.get(key);
        knowledge.executions++;
        knowledge.totalDuration += duration;
        
        if (result.success) {
            knowledge.successes++;
        } else {
            knowledge.failures++;
        }
    }

    getPerformanceStats(taskType) {
        const stats = [];
        
        for (const [key, value] of this.knowledge.entries()) {
            if (key.startsWith(taskType + ':')) {
                stats.push({
                    key,
                    avgDuration: value.totalDuration / value.executions,
                    successRate: value.successes / value.executions,
                    executions: value.executions
                });
            }
        }
        
        return stats;
    }

    // Task decomposition
    decomposeTask(task) {
        const subtasks = [];
        
        if (task.type === 'complex') {
            // Break down into smaller tasks
            if (task.steps) {
                task.steps.forEach((step, index) => {
                    subtasks.push({
                        id: `${task.id}-${index}`,
                        type: 'step',
                        data: step,
                        parentId: task.id,
                        priority: task.priority
                    });
                });
            }
        }
        
        return subtasks.length > 0 ? subtasks : [task];
    }

    // Task prioritization
    prioritize(tasks) {
        return tasks.sort((a, b) => {
            const priorityDiff = (b.priority || 5) - (a.priority || 5);
            if (priorityDiff !== 0) return priorityDiff;
            
            // If same priority, sort by complexity (simpler first)
            const complexityA = this.estimateComplexity(a);
            const complexityB = this.estimateComplexity(b);
            return complexityA - complexityB;
        });
    }

    // Resource optimization
    optimizeResourceUsage(tasks, availableResources) {
        const optimized = [];
        let remainingMemory = availableResources.memory;
        let remainingCPU = availableResources.cpu;
        
        const sorted = this.prioritize([...tasks]);
        
        for (const task of sorted) {
            const resources = this.estimateResources(task);
            
            if (resources.memory <= remainingMemory && resources.cpu <= remainingCPU) {
                optimized.push(task);
                remainingMemory -= resources.memory;
                remainingCPU -= resources.cpu;
            }
        }
        
        return optimized;
    }

    // Generate execution plan
    planExecution(task) {
        const analysis = this.analyzeTask(task);
        const subtasks = this.decomposeTask(task);
        
        return {
            task,
            analysis,
            subtasks,
            executionOrder: this.prioritize(subtasks),
            estimatedTotalTime: subtasks.reduce((sum, t) => 
                sum + this.estimateTime(t), 0
            ),
            requiredResources: this.estimateResources(task),
            strategy: analysis.strategy
        };
    }

    // Self-assessment
    assessCapability(task) {
        const complexity = this.estimateComplexity(task);
        const stats = this.getPerformanceStats(task.type);
        
        if (stats.length === 0) {
            return {
                capable: true,
                confidence: 0.5,
                reason: 'No prior experience with this task type'
            };
        }
        
        const avgSuccess = stats.reduce((sum, s) => sum + s.successRate, 0) / stats.length;
        
        return {
            capable: avgSuccess > 0.5,
            confidence: avgSuccess,
            reason: `Historical success rate: ${(avgSuccess * 100).toFixed(1)}%`
        };
    }
}

export default AgentBrain;
export { AgentBrain };
