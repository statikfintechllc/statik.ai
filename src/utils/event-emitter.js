export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event, listenerToRemove) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
    }

    emit(event, ...args) {
        // Fire specific listeners
        if (this.events[event]) {
            this.events[event].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }

        // Fire wildcard listeners
        if (event !== '*' && this.events['*']) {
            this.events['*'].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in wildcard listener for ${event}:`, error);
                }
            });
        }
    }
}
