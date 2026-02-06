/**
 * nlp.worker.js – Language processing pipeline
 *
 * Responsibilities:
 *   - Tokenisation
 *   - POS tagging (basic rule-based)
 *   - Intent extraction
 *   - Response composition
 */

self.addEventListener('message', (e) => {
  const { type, payload, id } = e.data;

  try {
    let result;
    switch (type) {
      case 'tokenise':
        result = tokenise(payload.text);
        break;
      case 'posTag':
        result = posTag(payload.tokens);
        break;
      case 'extractIntent':
        result = extractIntent(payload.tokens);
        break;
      default:
        result = null;
    }
    self.postMessage({ id, type: 'result', payload: result });
  } catch (err) {
    self.postMessage({ id, type: 'error', payload: err.message });
  }
});

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s?!.,]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function posTag(tokens) {
  // Basic rule-based POS tagging placeholder
  const verbs = new Set(['is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 'get', 'set', 'show', 'run', 'start', 'stop']);
  const determiners = new Set(['the', 'a', 'an', 'this', 'that', 'my', 'your']);

  return tokens.map((t) => {
    if (verbs.has(t)) return { token: t, pos: 'VERB' };
    if (determiners.has(t)) return { token: t, pos: 'DET' };
    if (/^\d+(\.\d+)?$/.test(t)) return { token: t, pos: 'NUM' };
    return { token: t, pos: 'NOUN' };
  });
}

function extractIntent(tokens) {
  const commands = ['show', 'get', 'set', 'do', 'run', 'start', 'stop', 'reset', 'export', 'import'];
  if (tokens.some((t) => t.endsWith('?'))) return { type: 'query', confidence: 0.8 };
  if (commands.includes(tokens[0])) return { type: 'command', confidence: 0.9 };
  return { type: 'statement', confidence: 0.6 };
}
