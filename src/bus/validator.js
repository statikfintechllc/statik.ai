/**
 * validator.js – Message schema validation
 *
 * Validates bus messages against JSON schemas before delivery.
 * Invalid messages are dropped and logged.
 */

export class MessageValidator {
  constructor() {
    this.schemas = new Map(); // topic → schema object
  }

  /** Register a schema for a message topic */
  register(topic, schema) {
    this.schemas.set(topic, schema);
  }

  /**
   * Validate a message payload against its registered schema.
   * Returns { valid: boolean, errors: string[] }.
   */
  validate(topic, payload) {
    const schema = this.schemas.get(topic);
    if (!schema) return { valid: true, errors: [] }; // no schema = pass

    const errors = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in payload)) errors.push(`missing required field: ${field}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
