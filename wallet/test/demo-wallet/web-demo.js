import elliptic from 'https://esm.sh/elliptic@6.6.1';
import scrypt from './vendor/scrypt-pbkdf2-shim.mjs';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');

const bufToHex = (b) => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hexToBuf = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(h=>parseInt(h,16)));

function normalizeKeyInput(key) {
  // Accept various shapes returned by scrypt-js and coerce to Uint8Array
  if (!key) return null;
  if (key instanceof Uint8Array) return key;
  if (key instanceof ArrayBuffer) return new Uint8Array(key);
  if (Array.isArray(key)) return new Uint8Array(key);
  if (key.buffer && key.buffer instanceof ArrayBuffer) return new Uint8Array(key.buffer);
  // fallback: try to construct from iterable
  try { return new Uint8Array(key); } catch (e) { return null; }
}

async function deriveKey(pass, saltHex) {
  const passBuf = new TextEncoder().encode(pass);
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const N = 16384, r = 8, p = 1; // reasonable default for demo

  // scrypt-js may export the function as default or as a named export.
  const scryptFn = (typeof scrypt === 'function') ? scrypt : (scrypt.scrypt || (scrypt.default && scrypt.default.scrypt));
  if (!scryptFn) throw new Error('scrypt implementation not found');

  const dk = await new Promise((resolve, reject) => {
    try {
      // callback signature: (error, progress, key) in some builds, or (error, derivedKey)
      scryptFn(passBuf, salt, N, r, p, 32, (err, progress, derivedKey) => {
        if (err) return reject(err);
        // some builds pass derivedKey as second arg
        const result = derivedKey || progress;
        const norm = (result instanceof Uint8Array) ? result : (result && result.buffer ? new Uint8Array(result.buffer) : (Array.isArray(result) ? new Uint8Array(result) : result));
        resolve(norm);
      });
    } catch (e) {
      reject(e);
    }
  });

  // Normalize dk and if it's not usable, fall back to PBKDF2 (demo fallback)
  let norm = normalizeKeyInput(dk);
  if (!norm || (norm.byteLength !== 16 && norm.byteLength !== 32)) {
    console.warn('scrypt returned unexpected key shape/length; falling back to PBKDF2 for demo');
    // PBKDF2 fallback: derive 256-bit key
    const passKey = await crypto.subtle.importKey('raw', passBuf, { name: 'PBKDF2' }, false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, passKey, 256);
    norm = new Uint8Array(derived);
  }

  console.debug('Derived key length:', norm.byteLength);
  return { key: norm, salt: bufToHex(salt) };
}

async function aesGcmEncrypt(keyBytes, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  if (!keyBytes || !(keyBytes instanceof Uint8Array)) throw new Error('Invalid AES key: expected Uint8Array');
  if (keyBytes.byteLength !== 16 && keyBytes.byteLength !== 32) throw new Error('AES key data must be 128 or 256 bits (16 or 32 bytes)');
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plaintext));
  return { iv: bufToHex(iv), ciphertext: bufToHex(ct) };
}

async function aesGcmDecrypt(keyBytes, ivHex, ciphertextHex) {
  const iv = hexToBuf(ivHex);
  const ct = hexToBuf(ciphertextHex);
  if (!keyBytes || !(keyBytes instanceof Uint8Array)) throw new Error('Invalid AES key: expected Uint8Array');
  if (keyBytes.byteLength !== 16 && keyBytes.byteLength !== 32) throw new Error('AES key data must be 128 or 256 bits (16 or 32 bytes)');
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct);
  return new TextDecoder().decode(pt);
}

// (rest of the file copied unchanged)
document.getElementById('create').addEventListener('click', async () => {
  const pass = document.getElementById('pass').value;
  if (!pass) return alert('passphrase required');
  const keyPair = ec.genKeyPair();
  const pub = keyPair.getPublic().encode('hex');
  const priv = keyPair.getPrivate().toString('hex');
  let key, salt;
  try {
    ({ key, salt } = await deriveKey(pass));
  } catch (err) {
    console.error('deriveKey failed during create:', err);
    alert('Error deriving key: ' + (err && err.message));
    return;
  }
  const keyBytes = normalizeKeyInput(key);
  const { iv, ciphertext } = await aesGcmEncrypt(keyBytes, priv);

  const keystore = {
    keystoreVersion: 1,
    id: 'web-demo-' + Date.now(),
    createdAt: new Date().toISOString(),
    createdBy: 'web-demo',
    kdf: 'scrypt',
    kdfParams: { salt },
    cipher: 'aes-256-gcm',
    cipherParams: { iv },
    publicKey: pub,
    encryptedPrivateKey: ciphertext
  };

  const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'keys-web-demo.json'; a.click();
  URL.revokeObjectURL(url);
  alert('Keystore descargado');
});

let imported = null;
document.getElementById('import').addEventListener('click', async () => {
  const f = document.getElementById('file').files[0];
  if (!f) return alert('Select a keystore file');
  const raw = await f.text();
  const data = JSON.parse(raw);
  const pass = document.getElementById('passIn').value;
  if (!pass) return alert('pass required');
  const salt = data.kdfParams?.salt;
  let keyObj;
  try {
    keyObj = await deriveKey(pass, salt);
  } catch (err) {
    console.error('deriveKey failed during import:', err);
    document.getElementById('out').textContent = 'deriveKey error: ' + (err && err.message);
    return;
  }
  const keyBytes = normalizeKeyInput(keyObj.key);
  try {
    const priv = await aesGcmDecrypt(keyBytes, data.cipherParams.iv, data.encryptedPrivateKey);
    imported = { priv, pub: data.publicKey };
    document.getElementById('out').textContent = 'Imported publicKey: ' + data.publicKey;
  } catch (err) {
    console.error('aesGcmDecrypt failed:', err);
    document.getElementById('out').textContent = 'Decrypt failed: ' + (err && err.message);
  }
});

document.getElementById('sign').addEventListener('click', async () => {
  if (!imported) return alert('Import a keystore first');
  const payload = document.getElementById('payload').value;
  const keyPair = ec.keyFromPrivate(imported.priv, 'hex');
  const hash = (new TextEncoder()).encode(payload);
  const signature = keyPair.sign(hash);
  const out = {
    r: signature.r.toString(16),
    s: signature.s.toString(16)
  };
  document.getElementById('out').textContent = JSON.stringify(out, null, 2);
});