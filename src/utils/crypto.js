/**
 * crypto.js – Encryption helpers
 *
 * Wraps Web Crypto API for AES-GCM encryption/decryption.
 * Used for protecting sensitive stored data.
 */

/** Generate an AES-GCM 256-bit key */
export async function generateKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a string with an AES-GCM key */
export async function encrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) };
}

/** Decrypt ciphertext with an AES-GCM key */
export async function decrypt(key, encrypted) {
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.ciphertext);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuffer);
}

/** Export a key as JSON-serialisable JWK */
export async function exportKey(key) {
  return crypto.subtle.exportKey('jwk', key);
}

/** Import a key from JWK */
export async function importKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}
