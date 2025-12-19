// Lightweight secp256k1 wrapper with a stable API for browser use.
// Implementation: @noble/secp256k1 vendored locally under vendor/secp256k1-lib.
// This keeps CSP strict ('self') and avoids Node polyfills.
import * as noble from "./secp256k1-lib/index.js";

function hexToBytes(hex) {
  if (typeof hex !== 'string') throw new Error('hex must be a string');
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  return arr;
}
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Provide WebCrypto-backed HMAC-SHA256 for noble's async signing path
async function hmacSha256(keyBytes, msgBytes) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return new Uint8Array(sig);
}

// Wire up noble to use async HMAC in browsers (avoids "hashes.hmacSha256 not set")
if (noble?.hashes) {
  noble.hashes.hmacSha256Async = (key, msg) => hmacSha256(key, msg);
}

export function generatePrivateKey() {
  // noble recommends randomPrivateKey(); here we rely on built-in randomness
  const priv = noble.utils.randomPrivateKey();
  return bytesToHex(priv);
}

export function getPublicKey(privHex, opts = { compressed: false }) {
  const privBytes = hexToBytes(privHex);
  const compressed = !!opts.compressed;
  const pubBytes = noble.getPublicKey(privBytes, compressed);
  // Ensure uncompressed 04 + X + Y for compatibility when not compressed
  return bytesToHex(pubBytes);
}

export async function sign(msgHashBytes, privHex) {
  const privBytes = hexToBytes(privHex);
  // noble.sign returns 64-byte signature (r||s) by default
  const sigBytes = await noble.signAsync(msgHashBytes, privBytes, { lowS: true, prehash: false });
  // Split into r and s (32 bytes each)
  const r = bytesToHex(sigBytes.slice(0, 32));
  const s = bytesToHex(sigBytes.slice(32, 64));
  return { r, s };
}

export function verify(sig, msgHashBytes, pubHex) {
  const pubBytes = hexToBytes(pubHex);
  // Combine r and s back to 64-byte signature
  const rBytes = hexToBytes(sig.r);
  const sBytes = hexToBytes(sig.s);
  const sigBytes = new Uint8Array(64);
  sigBytes.set(rBytes, 0);
  sigBytes.set(sBytes, 32);
  return noble.verify(sigBytes, msgHashBytes, pubBytes, { prehash: false });
}
