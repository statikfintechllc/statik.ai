import { EventEmitter } from '../../src/utils/event-emitter.js'; // We need to mock or implement this
import { Channels, Priorities } from './channels.js';
import { Validator } from './validator.js';

export class MessageBus extends EventEmitter {
    constructor() {
        super();
        this.channels = new Map();
        this.validator = new Validator();

        // Initialize channels
        Object.values(Channels).forEach(channel => {
            this.channels.set(channel, []);
        });
    }

    subscribe(topic, callback) {
        this.on(topic, callback);
        return () => this.off(topic, callback);
    }

    publish(message) {
        const validation = this.validator.validate(message);
        if (!validation.valid) {
            console.error('Invalid message:', validation.error, message);
            return false;
        }

        const channel = message.channel || Channels.DEFAULT;

        // TODO: Priority queue handling could go here

        try {
            this.emit(message.type, message);
            // specific target emission
            if (message.target) {
                this.emit(message.target, message);
            }
            return true;
        } catch (err) {
            console.error('Bus publish error:', err);
            return false;
        }
    }
}
