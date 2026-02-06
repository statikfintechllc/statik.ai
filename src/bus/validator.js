/**
 * Simple Message Validator
 * Validates messages against basic schemas (until full JSON Schema validator is added)
 */

export class Validator {
    constructor() {
        this.cache = new Map();
    }

    validate(message, schemaName) {
        // TODO: distinct schema validation for each type
        // For now, basic structural check
        if (!message || typeof message !== 'object') {
            return { valid: false, error: 'Message must be an object' };
        }

        if (!message.id) {
            return { valid: false, error: 'Message missing "id"' };
        }

        if (!message.type) {
            return { valid: false, error: 'Message missing "type"' };
        }

        if (!message.timestamp) {
            return { valid: false, error: 'Message missing "timestamp"' };
        }

        return { valid: true };
    }
}
