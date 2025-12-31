
// import pkg from 'scrypt-js';
import * as secp from '@noble/secp256k1';
//  import crypto from 'crypto';
import fs from 'fs';
import pkg from 'scrypt-js';
// import * as secp from '@noble/secp256k1';
import crypto from 'crypto';

const { scrypt } = pkg;

async function main() {
  // Carga el keystore
  const keystore = JSON.parse(fs.readFileSync('keystore.json', 'utf8'));
  const passphrase = 'javi'; // <-- pon aquí la passphrase real

  // Deriva la clave para descifrar
  console.log('salt:', keystore.kdfParams.salt);
  console.log('iv:', keystore.cipherParams.iv);
  console.log('encryptedPrivateKey:', keystore.encryptedPrivateKey);
  const salt = Buffer.from(keystore.kdfParams.salt, 'hex');
  const iv = Buffer.from(keystore.cipherParams.iv, 'hex');
  const encrypted = Buffer.from(keystore.encryptedPrivateKey, 'hex');
  // Logs hexadecimales para depuración
  console.log('iv (hex):', iv.toString('hex'));
  console.log('salt (hex):', salt.toString('hex'));
  console.log('encrypted (hex):', encrypted.toString('hex'));

  // Usar la versión asíncrona moderna de scrypt-js
  const keyArr = await scrypt(
    Buffer.from(passphrase),
    salt,
    16384, 8, 1, 32
  );
  const key = Buffer.from(keyArr);
  console.log('key (hex):', key.toString('hex'));

  // Descifra la clave privada (separa el tag de autenticación)
  const tagLength = 16;
  const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
  const authTag = encrypted.slice(encrypted.length - tagLength);
  // Logs hexadecimales para depuración
  console.log('ciphertext (hex):', ciphertext.toString('hex'));
  console.log('authTag (hex):', authTag.toString('hex'));
  console.log('encrypted.length:', encrypted.length);
  console.log('ciphertext.length:', ciphertext.length);
  console.log('authTag.length:', authTag.length);
  console.log('iv.length:', iv.length);
  console.log('key.length:', key.length);
  // Asegura que todo es Buffer
  if (!Buffer.isBuffer(key) || !Buffer.isBuffer(iv) || !Buffer.isBuffer(ciphertext) || !Buffer.isBuffer(authTag)) {
    throw new Error('¡Algún dato no es Buffer!');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // Convierte los bytes descifrados de vuelta a hex
  let privHex = Buffer.from(decrypted).toString('hex');
  if (privHex.startsWith('0x')) privHex = privHex.slice(2);
  if (privHex.length === 128) privHex = privHex.slice(0, 64);
  if (privHex.length !== 64) {
    throw new Error('Longitud inesperada de clave privada: ' + privHex.length);
  }

  // Deriva la clave pública
  let derivedPubKey = secp.getPublicKey(privHex);
  if (derivedPubKey instanceof Uint8Array) {
    derivedPubKey = Array.from(derivedPubKey).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Compara con la del keystore
  console.log('Clave privada descifrada:', privHex);
  console.log('Clave pública derivada:', derivedPubKey);
  console.log('Clave pública keystore:', keystore.publicKey);
  console.log('¿Coinciden?:', derivedPubKey === keystore.publicKey);

  // Prueba de firma
  const msg = 'test message';
  const msgHash = crypto.createHash('sha256').update(msg).digest();
  const signature = secp.signSync(msgHash, privHex);
  const isValid = secp.verify(signature, msgHash, derivedPubKey);
  console.log('¿Firma válida?:', isValid);
}

main().catch(e => {
  console.error('Error en main:', e);
});