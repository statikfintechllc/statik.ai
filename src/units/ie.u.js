export default class IEUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ie.u';
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        this.bus.subscribe('goal.execute', (msg) => {
            this.execute(msg.payload);
        });
    }

    execute(payload) {
        console.log(`IE: Executing action ${payload.action}`);

        if (payload.action === 'ui.output') {
            this.bus.publish({
                id: `act_${Date.now()}`,
                type: 'ui.output',
                source: this.id,
                timestamp: Date.now(),
                content: payload.params.text,
                payload: payload.params
            });
        }
    }
}
