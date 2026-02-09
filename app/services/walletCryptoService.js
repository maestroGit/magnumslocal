// Wallet crypto helpers (keystore decrypt)

import crypto from 'crypto';

export const decryptPrivateKeyFromKeystore = async (keystore, passphrase) => {
  console.log('[decryptPrivateKeyFromKeystore] keystore:', keystore);
  console.log('[decryptPrivateKeyFromKeystore] passphrase:', passphrase);

  const salt = /^[0-9a-fA-F]+$/.test(keystore.kdfParams.salt)
    ? Buffer.from(keystore.kdfParams.salt, 'hex')
    : Buffer.from(keystore.kdfParams.salt, 'base64');
  const iv = /^[0-9a-fA-F]+$/.test(keystore.cipherParams.iv)
    ? Buffer.from(keystore.cipherParams.iv, 'hex')
    : Buffer.from(keystore.cipherParams.iv, 'base64');
  const ct = Buffer.from(keystore.encryptedPrivateKey, 'base64');
  const authTag = Buffer.from(keystore.tag, 'base64');

  console.log('[decryptPrivateKeyFromKeystore] salt:', salt.toString('hex'), 'length:', salt.length);
  console.log('[decryptPrivateKeyFromKeystore] iv:', iv.toString('hex'), 'length:', iv.length);
  console.log('[decryptPrivateKeyFromKeystore] ciphertext:', ct.toString('hex'), 'length:', ct.length);

  if (salt.length === 0) {
    console.error("[WALLET-ERROR] El campo 'salt' esta vacio o mal decodificado");
  }
  if (iv.length === 0) {
    console.error("[WALLET-ERROR] El campo 'iv' esta vacio o mal decodificado");
  }
  if (ct.length === 0) {
    console.error("[WALLET-ERROR] El campo 'encryptedPrivateKey' esta vacio o mal decodificado");
  }
  if (authTag.length === 0) {
    console.error("[WALLET-ERROR] El campo 'tag' esta vacio o mal decodificado");
  }

  console.log('[decryptPrivateKeyFromKeystore] authTag:', authTag.toString('hex'));
  console.log('[decryptPrivateKeyFromKeystore] ct (sin authTag):', ct.toString('hex'));

  const { iterations, keylen, digest } = keystore.kdfParams;
  let derivedKey;
  try {
    derivedKey = await new Promise((resolve, reject) => {
      crypto.pbkdf2(passphrase, salt, iterations, keylen, digest, (err, key) => {
        if (err) return reject(err);
        resolve(key);
      });
    });
  } catch (e) {
    console.error('[crypto.pbkdf2] error:', e);
    throw new Error('Key derivation failed: ' + (e && e.message));
  }

  console.log('[DEBUG] Derived key (hex):', derivedKey.toString('hex'));
  console.log('[crypto.pbkdf2] Derived key length:', derivedKey.length);
  console.log('[DEBUG] iv (hex):', iv.toString('hex'), 'length:', iv.length);
  console.log('[DEBUG] ct (hex):', ct.toString('hex'), 'length:', ct.length);
  console.log('[DEBUG] authTag (hex):', authTag.toString('hex'), 'length:', authTag.length);

  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ct);
  console.log('[decryptPrivateKeyFromKeystore] antes de decipher.final()');

  try {
    let finalBuf;
    let finished = false;
    let errorFinal = null;

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!finished) {
          const timeoutErr = new Error('Timeout en decipher.final()');
          console.error('[decryptPrivateKeyFromKeystore] decipher.final() timeout: posible cuelgue o clave incorrecta');
          console.error('[decryptPrivateKeyFromKeystore] decipher.final() error stack:', timeoutErr.stack);
          reject(timeoutErr);
        }
      }, 5000);
      try {
        finalBuf = decipher.final();
        finished = true;
        resolve();
      } catch (e) {
        errorFinal = e;
        finished = true;
        console.error('[decryptPrivateKeyFromKeystore] decipher.final() error stack:', e.stack);
        resolve();
      }
    });

    if (errorFinal) {
      console.error('[decryptPrivateKeyFromKeystore] ERROR en decipher.final():', errorFinal);
      if (errorFinal.message) {
        console.error('[decryptPrivateKeyFromKeystore] decipher.final() error message:', errorFinal.message);
      }
      if (errorFinal.stack) {
        console.error('[decryptPrivateKeyFromKeystore] decipher.final() error stack:', errorFinal.stack);
      }
      throw new Error('Error al descifrar la clave privada en decipher.final(): ' + errorFinal.message);
    }

    decrypted = Buffer.concat([decrypted, finalBuf]);
    console.log('[decryptPrivateKeyFromKeystore] decrypted buffer:', decrypted);
    console.log('[decryptPrivateKeyFromKeystore] decrypted hex:', decrypted.toString('hex'));
    console.log('[decryptPrivateKeyFromKeystore] decrypted utf8:', decrypted.toString('utf8'));

    return decrypted;
  } catch (finalErr) {
    console.error('[decryptPrivateKeyFromKeystore] ERROR en decipher.final():', finalErr);
    if (finalErr && finalErr.message) {
      console.error('[decryptPrivateKeyFromKeystore] decipher.final() error message:', finalErr.message);
    }
    if (finalErr && finalErr.stack) {
      console.error('[decryptPrivateKeyFromKeystore] decipher.final() error stack:', finalErr.stack);
    }
    throw new Error('Error al descifrar la clave privada en decipher.final(): ' + finalErr.message);
  }
};
