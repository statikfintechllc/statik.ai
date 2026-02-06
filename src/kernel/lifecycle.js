export class LifecycleManager {
    constructor(registry, bus) {
        this.registry = registry;
        this.bus = bus;
    }

    async boot() {
        console.log('Lifecycle: Starting boot sequence...');
        const units = this.registry.getLoadOrder();

        for (const unitConfig of units) {
            await this.initializeUnit(unitConfig);
        }

        this.bus.publish({
            id: `sys_ready_${Date.now()}`,
            type: 'system.ready',
            timestamp: Date.now(),
            source: 'kernel',
            content: 'All units initialized'
        });
    }

    async initializeUnit(unitConfig) {
        console.log(`Lifecycle: Initializing ${unitConfig.id}...`);

        try {
            // dynamic import of unit module
            // Note: In a real browser environment, paths might need adjustment based on base URL
            const module = await import(`../../${unitConfig.path}`);
            const UnitClass = module.default;

            if (!UnitClass) {
                throw new Error(`Module ${unitConfig.path} does not export default class`);
            }

            const instance = new UnitClass(this.bus);
            const registryEntry = this.registry.get(unitConfig.id);
            registryEntry.instance = instance;
            registryEntry.status = 'active';

            // Simulate "ready" reporting
            if (instance.onInit) {
                await instance.onInit();
            }

            console.log(`Lifecycle: ${unitConfig.id} ready.`);
        } catch (err) {
            console.error(`Lifecycle: Failed to initialize ${unitConfig.id}`, err);
            this.registry.get(unitConfig.id).status = 'error';
            throw err; // Fail hard for now on boot error
        }
    }
}
