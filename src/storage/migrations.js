/**
 * migrations.js – Schema migration system
 *
 * When data schemas change between versions, migrations
 * transform existing records to match the new shape.
 */

const MIGRATIONS = [
  // Example migration:
  // {
  //   from: '0.1.0',
  //   to: '0.2.0',
  //   migrate: async (db) => {
  //     // Add 'confidence' field to all concepts
  //     const tx = db.transaction('concepts', 'readwrite');
  //     const store = tx.objectStore('concepts');
  //     const all = await store.getAll();
  //     for (const concept of all) {
  //       concept.confidence = concept.confidence ?? 0.5;
  //       store.put(concept);
  //     }
  //   }
  // }
];

/** Compare two semver strings. Returns -1, 0, or 1. */
function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/** Run all pending migrations between two versions */
export async function runMigrations(db, fromVersion, toVersion) {
  const pending = MIGRATIONS.filter(
    (m) => compareSemver(m.from, fromVersion) >= 0 && compareSemver(m.to, toVersion) <= 0
  );

  for (const migration of pending) {
    console.log(`[migrations] ${migration.from} → ${migration.to}`);
    await migration.migrate(db);
  }

  return pending.length;
}
