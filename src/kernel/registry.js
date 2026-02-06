export class UnitRegistry {
    constructor() {
        this.units = new Map();
        this.loadOrder = [];
    }

    async load(configPath) {
        try {
            const response = await fetch(configPath);
            const config = await response.json();

            this.loadOrder = config.units.sort((a, b) => a.order - b.order);

            this.loadOrder.forEach(unitConfig => {
                this.units.set(unitConfig.id, {
                    ...unitConfig,
                    status: 'registered',
                    instance: null
                });
            });

            console.log('Unit Registry loaded:', this.units.size, 'units');
            return true;
        } catch (err) {
            console.error('Failed to load unit registry:', err);
            return false;
        }
    }

    get(id) {
        return this.units.get(id);
    }

    getAll() {
        return Array.from(this.units.values());
    }

    getLoadOrder() {
        return this.loadOrder;
    }
}
