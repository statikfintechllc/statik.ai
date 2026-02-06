export default class NLPUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'nlp.u';
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        this.bus.subscribe('goal.new', (msg) => {
            const goal = msg.payload.goal;
            if (goal.type === 'response.generate') {
                this.generateResponse(goal);
            }
        });
    }

    generateResponse(goal) {
        console.log(`NLP: Generating response for goal ${goal.id}`);

        const input = goal.params.input.toLowerCase();
        let responseText = "I received your message.";

        // Simple template logic
        if (input.includes('hello') || input.includes('hi')) {
            responseText = "Greetings! I am Statik.ai, your Client-Side Agent.";
        } else if (input.includes('time')) {
            responseText = `Current time is ${new Date().toLocaleTimeString()}`;
        } else if (input.includes('status')) {
            responseText = "All systems operational. Perception, Attention, and Temporal units are online.";
        } else {
            responseText = `I heard you say: "${goal.params.input}". I am not yet fully trained to understand complex queries, but I am listening.`;
        }

        // Emit action plan (intent to speak)
        this.bus.publish({
            id: `msg_${Date.now()}`,
            type: 'goal.execute', // Skipping IE planning phase for now, direct execution request
            source: this.id,
            timestamp: Date.now(),
            content: `Generated response`,
            payload: {
                action: 'ui.output',
                params: { text: responseText }
            }
        });
    }
}
