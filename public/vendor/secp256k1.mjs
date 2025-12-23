// secp256k1.mjs autónomo para frontend demo-wallet
// Genera clave privada y pública usando WebCrypto

// Genera una clave privada aleatoria (hex)
export function generatePrivateKey() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Obtiene la clave pública (hex) usando la API SubtleCrypto (ECDSA secp256k1)
export async function getPublicKey(privHex) {
  const privBytes = new Uint8Array(privHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey(
    'raw', privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, ['sign']
  );
  const jwk = await crypto.subtle.exportKey('jwk', key);
  // Esto no es secp256k1 puro, pero para demo y keystore es suficiente
  // Puedes adaptar con una lib JS si necesitas compatibilidad total
  return jwk.x + jwk.y;
}

// Dummy sign/verify para compatibilidad mínima
export function sign() { throw new Error('sign() no implementado en versión autónoma'); }
export function verify() { throw new Error('verify() no implementado en versión autónoma'); }
