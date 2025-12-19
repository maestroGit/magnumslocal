// Minimal secp256k1 wrapper using 'noble-secp256k1' for browser usage
// You can replace this with a more complete implementation as needed
import * as nobleSecp from "https://cdn.jsdelivr.net/npm/@noble/secp256k1@1.7.1/+esm";

export const utils = nobleSecp.utils;
export const getPublicKey = nobleSecp.getPublicKey;
export const sign = nobleSecp.sign;
export const verify = nobleSecp.verify;
export const getSharedSecret = nobleSecp.getSharedSecret;
export const schnorr = nobleSecp.schnorr;

// Generate a random private key (Uint8Array)
export function randomPrivateKey() {
  return nobleSecp.utils.randomPrivateKey();
}

// Generate a key pair (returns {privateKey, publicKey})
// Helper: Uint8Array to hex string
function bufToHex(b) {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function genKeyPair() {
  const privateKey = nobleSecp.utils.randomPrivateKey();
  const publicKey = nobleSecp.getPublicKey(privateKey, true);
  return {
    getPrivate: () => bufToHex(privateKey),
    getPublic: () => bufToHex(publicKey),
    privateKey,
    publicKey
  };
}
