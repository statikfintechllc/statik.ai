export default class TIUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ti.u';
        this.timeline = [];
        this.maxHistory = 10;
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        this.bus.subscribe('context.salient', (msg) => {
            this.integrate(msg.payload.frame);
        });
    }

    integrate(frame) {
        // Add to timeline
        this.timeline.push(frame);
        if (this.timeline.length > this.maxHistory) {
            this.timeline.shift();
        }

        console.log(`TI: Integrated frame ${frame.id}. Timeline length: ${this.timeline.length}`);

        // Emit temporal context (Stream of Consciousness)
        this.bus.publish({
            id: `msg_${Date.now()}`,
            type: 'context.temporal',
            source: this.id,
            timestamp: Date.now(),
            content: `Temporal context updated`,
            payload: {
                current: frame,
                history: this.timeline
            }
        });
    }
}
