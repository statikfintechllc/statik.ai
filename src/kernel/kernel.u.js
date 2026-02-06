import { MessageBus } from '../bus/bus.u.js';
import { UnitRegistry } from './registry.js';
import { LifecycleManager } from './lifecycle.js';

export class Kernel {
    constructor() {
        this.bus = new MessageBus();
        this.registry = new UnitRegistry();
        this.lifecycle = new LifecycleManager(this.registry, this.bus);
        this.startTime = Date.now();
    }

    async init() {
        console.log('Kernel: Initializing...');

        // 1. Load Registry
        await this.registry.load('./configs/units.registry.json');

        // 2. Start Lifecycle Management
        await this.lifecycle.boot();

        console.log(`Kernel: System ready in ${Date.now() - this.startTime}ms`);
    }
}
