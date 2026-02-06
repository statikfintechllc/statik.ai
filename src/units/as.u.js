export default class ASUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'as.u';
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        this.bus.subscribe('context.new', (msg) => {
            this.evaluateSalience(msg.payload.frame);
        });
    }

    evaluateSalience(frame) {
        // Simple heuristic: User input is always high salience for now
        let score = 0.5;

        if (frame.source === 'user') {
            score = 1.0; // Urgent
        }

        const threshold = 0.7;

        if (score >= threshold) {
            console.log(`AS: Frame ${frame.id} is salient (score: ${score})`);

            // Promote to salient context
            this.bus.publish({
                id: `msg_${Date.now()}`,
                type: 'context.salient',
                source: this.id,
                timestamp: Date.now(),
                content: `Salient context identified`,
                payload: {
                    frame: frame,
                    score: score
                }
            });
        } else {
            console.log(`AS: Frame ${frame.id} ignored (score: ${score})`);
        }
    }
}
