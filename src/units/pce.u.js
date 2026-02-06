export default class PCEUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'pce.u';
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Listen for raw input from UI
        this.bus.subscribe('ui.input', (msg) => {
            this.processInput(msg);
        });
    }

    processInput(msg) {
        console.log('PCE: Processing input', msg.content);

        // 1. Normalize (trim, lowercase, etc.)
        const raw = msg.content;
        const normalized = raw.trim();

        if (!normalized) return;

        // 2. Create Context Frame
        const contextFrame = {
            id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            source: 'user',
            raw: normalized,
            features: {
                length: normalized.length,
                isQuestion: normalized.includes('?')
            }
        };

        // 3. Emit context.new
        this.bus.publish({
            id: `msg_${Date.now()}`,
            type: 'context.new',
            source: this.id,
            timestamp: Date.now(),
            content: `New context from user`,
            payload: { frame: contextFrame }
        });
    }
}
