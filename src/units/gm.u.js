export default class GMUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'gm.u';
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Listen for temporal context updates (stream of consciousness)
        this.bus.subscribe('context.temporal', (msg) => {
            this.evaluateGoals(msg.payload.current);
        });
    }

    evaluateGoals(frame) {
        // Simple reactive goal: If user input, create goal to respond
        if (frame && frame.source === 'user') {
            console.log(`GM: New user input detected. Creating goal to respond.`);

            const goal = {
                id: `goal_${Date.now()}`,
                type: 'response.generate',
                priority: 1, // High priority
                params: {
                    input: frame.raw,
                    context_id: frame.id
                }
            };

            this.bus.publish({
                id: `msg_${Date.now()}`,
                type: 'goal.new',
                source: this.id,
                timestamp: Date.now(),
                content: `New goal: Respond to user`,
                payload: { goal }
            });
        }
    }
}
