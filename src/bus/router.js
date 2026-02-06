/**
 * router.js – Message routing logic
 *
 * Determines which unit(s) should receive a message
 * based on the target field and routing rules.
 */

export class Router {
  constructor(registry) {
    this.registry = registry;
    this.routes = new Map(); // pattern → unitId[]
  }

  /** Register a routing rule */
  addRoute(pattern, unitId) {
    if (!this.routes.has(pattern)) this.routes.set(pattern, []);
    this.routes.get(pattern).push(unitId);
  }

  /** Resolve the target unit(s) for a given topic */
  resolve(topic) {
    // Exact match
    if (this.routes.has(topic)) return this.routes.get(topic);

    // Wildcard match (e.g. "unit.*" matches "unit.started")
    for (const [pattern, targets] of this.routes) {
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        if (topic.startsWith(prefix)) return targets;
      }
    }

    return [];
  }
}
