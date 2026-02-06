/**
 * cognition.worker.js – Heavy computation off the main thread
 *
 * Responsibilities:
 *   - Pattern matching (cm.u queries)
 *   - Similarity scoring (vector operations)
 *   - Goal prioritisation (gm.u)
 *   - Intent classification (nlp.u)
 *
 * Communication: message-only with main thread.
 * No DOM access. Independent error boundary.
 */

self.addEventListener('message', (e) => {
  const { type, payload, id } = e.data;

  try {
    let result;
    switch (type) {
      case 'similarity':
        result = cosineSimilarity(payload.a, payload.b);
        break;
      case 'classify':
        result = classifyIntent(payload.tokens);
        break;
      default:
        result = null;
    }
    self.postMessage({ id, type: 'result', payload: result });
  } catch (err) {
    self.postMessage({ id, type: 'error', payload: err.message });
  }
});

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function classifyIntent(tokens) {
  if (!tokens || tokens.length === 0) return 'unknown';
  const commands = ['show', 'get', 'set', 'do', 'run', 'start', 'stop', 'reset'];
  if (commands.includes(tokens[0])) return 'command';
  if (tokens.some((t) => t.endsWith('?'))) return 'query';
  return 'statement';
}
