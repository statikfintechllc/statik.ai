/**
 * compute.worker.js – Math / crypto operations
 *
 * Responsibilities:
 *   - Hash generation (deduplication)
 *   - Encryption helpers
 *   - Vector math (TF-IDF, cosine similarity)
 */

self.addEventListener('message', (e) => {
  const { type, payload, id } = e.data;

  handleMessage(type, payload)
    .then((result) => self.postMessage({ id, type: 'result', payload: result }))
    .catch((err) => self.postMessage({ id, type: 'error', payload: err.message }));
});

async function handleMessage(type, payload) {
  switch (type) {
    case 'hash':
      return hashText(payload.text);
    case 'cosineSimilarity':
      return cosineSimilarity(payload.a, payload.b);
    case 'tfidf':
      return computeTFIDF(payload.documents, payload.query);
    default:
      return null;
  }
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

function computeTFIDF(documents, query) {
  // Placeholder – basic term frequency
  const queryTokens = query.toLowerCase().split(/\s+/);
  return documents.map((doc, i) => {
    const docTokens = doc.toLowerCase().split(/\s+/);
    const score = queryTokens.reduce((sum, qt) => {
      const tf = docTokens.filter((t) => t === qt).length / docTokens.length;
      return sum + tf;
    }, 0);
    return { index: i, score };
  });
}
