// PBKDF2 shim for the browser demo
// Implements callback-style API: scrypt(password, salt, N, r, p, dkLen, callback)
// Uses WebCrypto PBKDF2 as a reliable fallback for the demo environment.

function scrypt(password, salt, N, r, p, dkLen, callback) {
  try {
    const passBuf = (password instanceof Uint8Array) ? password : new TextEncoder().encode(String(password));
    const saltBuf = (salt instanceof Uint8Array) ? salt : (typeof salt === 'string' ? hexToUint8(salt) : new Uint8Array(salt || []));

    crypto.subtle.importKey('raw', passBuf, { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(key => {
        // Use iterations derived from N to simulate work (not equivalent to scrypt)
        const iterations = Math.max(100000, Math.floor((N || 16384) / 10));
        return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuf, iterations, hash: 'SHA-256' }, key, dkLen * 8);
      })
      .then(bits => {
        const u = new Uint8Array(bits);
        callback(null, null, u);
      })
      .catch(err => callback(err));
  } catch (e) {
    callback(e);
  }

  function hexToUint8(h) {
    if (!h) return new Uint8Array();
    const clean = h.replace(/^0x/, '');
    const bytes = new Uint8Array(Math.ceil(clean.length / 2));
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    return bytes;
  }
}

export default scrypt;
