// Browser crypto polyfill for esm-built modules expecting node:crypto
// Provides minimal randomBytes compatible with common libraries.
const cryptoObj = (typeof globalThis !== 'undefined' && (globalThis.crypto || globalThis.msCrypto)) || null;

function randomBytes(length) {
  const out = new Uint8Array(length);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(out);
    return out;
  }
  // Fallback: insecure RNG (only for demo). Do NOT use in production.
  for (let i = 0; i < length; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

export default { randomBytes };
export { randomBytes };
