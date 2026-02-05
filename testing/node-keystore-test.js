// Node.js test: generate and decrypt keystore using AES-256-GCM and scrypt-js
import crypto from 'crypto';
// Usar scrypt nativo de Node.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const passphrase = 'javi';
const salt = Buffer.from('e5f04569a72650fef3627ba86e31d8b9', 'hex');
const iv = Buffer.from('a7bb2c8ff1726f453c56bec8', 'hex');
const privKeyHex = 'b8e1a1d2c3f4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0'; // ejemplo
const privKeyBuf = Buffer.from(privKeyHex, 'hex');
import elliptic from 'elliptic';
const EC = elliptic.ec;
const ec = new EC('secp256k1');
const keyPair = ec.keyFromPrivate(privKeyHex, 'hex');
const N = 16384, r = 8, p = 1, dkLen = 32;

async function main() {
    console.log('Iniciando derivación de clave (crypto.scrypt)...');
    // Derivar clave con scrypt nativo
    const derivedKey = await new Promise((resolve, reject) => {
        crypto.scrypt(passphrase, salt, dkLen, { N, r, p }, (err, key) => {
            if (err) return reject(err);
            resolve(key);
        });
    });
    console.log('Derived key (hex):', derivedKey.toString('hex'));

  // Cifrar clave privada
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(privKeyBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([encrypted, authTag]);
  console.log('Cifrado OK');
  console.log('Ciphertext (hex):', ciphertext.toString('hex'));
  console.log('AuthTag (hex):', authTag.toString('hex'));

  // Guardar keystore
  const keystore = {
    keystoreVersion: 1,
    id: 'node-test-' + Date.now(),
    createdAt: new Date().toISOString(),
    createdBy: 'node-test',
    kdf: 'scrypt',
    kdfParams: { salt: salt.toString('hex') },
    cipher: 'aes-256-gcm',
    cipherParams: { iv: iv.toString('hex') },
  publicKey: keyPair.getPublic().encode('hex'),
    encryptedPrivateKey: ciphertext.toString('hex'),
  };
  // Guardar keystore en ruta fija magnumsmaster/app/uploads/wallet_node_test.json
  const keystorePath = path.resolve(__dirname, '../../uploads/wallet_node_test.json');
  const uploadsDir = path.dirname(keystorePath);
  if (!fs.existsSync(uploadstestDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.writeFileSync(keystorePath, JSON.stringify(keystore, null, 2));
  console.log('Keystore guardado en', keystorePath);

  // Descifrar clave privada
  console.log('Iniciando descifrado...');
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  console.log('Descifrado OK');
  console.log('Clave privada descifrada (hex):', decrypted.toString('hex'));
}

main().catch(console.error);
