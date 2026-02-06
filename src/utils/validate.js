/**
 * validate.js – Schema validation helpers
 *
 * Lightweight JSON schema validation without external libraries.
 * Validates required fields, types, and enum values.
 */

/**
 * Validate an object against a simple schema.
 * Returns { valid: boolean, errors: string[] }
 */
export function validate(obj, schema) {
  const errors = [];

  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj)) errors.push(`Missing required field: ${field}`);
    }
  }

  if (schema.properties) {
    for (const [key, rules] of Object.entries(schema.properties)) {
      if (!(key in obj)) continue;
      const val = obj[key];

      if (rules.type && typeof val !== rules.type && rules.type !== 'array') {
        errors.push(`${key}: expected ${rules.type}, got ${typeof val}`);
      }

      if (rules.type === 'array' && !Array.isArray(val)) {
        errors.push(`${key}: expected array`);
      }

      if (rules.enum && !rules.enum.includes(val)) {
        errors.push(`${key}: must be one of [${rules.enum.join(', ')}]`);
      }

      if (rules.minimum !== undefined && val < rules.minimum) {
        errors.push(`${key}: must be >= ${rules.minimum}`);
      }

      if (rules.maximum !== undefined && val > rules.maximum) {
        errors.push(`${key}: must be <= ${rules.maximum}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
