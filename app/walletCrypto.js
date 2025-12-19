import { Wallet } from "../wallet/wallet.js";
import { v4 as uuidv4 } from "uuid";

// Genera un keystore moderno cifrado con la passphrase
export async function generateKeystore(passphrase) {
  // 1. Generar wallet nueva (solo una vez)
  const wallet = new Wallet();
  console.log('[GENKEY] Clave privada generada (hex):', wallet.privateKey);
  console.log('[GENKEY] Clave pública derivada:', wallet.publicKey);
  // 2. Cifrar la clave privada (hex)
  const enc = encryptWallet(wallet.privateKey, passphrase);
  // 3. Usar la publicKey del mismo wallet generado
  const keystore = {
    keystoreVersion: 1,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    createdBy: "magnumsmaster-backend",
    kdf: "pbkdf2",
    kdfParams: {
      salt: enc.salt,
      iterations: 100000,
      keylen: 32,
      digest: "sha256"
    },
    cipher: "aes-256-gcm",
    cipherParams: {
      iv: enc.iv
    },
    tag: enc.tag,
    publicKey: wallet.publicKey,
    encryptedPrivateKey: enc.encryptedPrivateKey
  };
  console.log('[GENKEY] Keystore final generado:', JSON.stringify(keystore, null, 2));
  return keystore;
}
// Utilidades para cifrar y descifrar wallets usando AES-GCM y PBKDF2
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEYLEN = 32; // 256 bits
const IVLEN = 12; // 96 bits para GCM
const SALTLEN = 16;
const PBKDF2_ITER = 100_000;

export function encryptWallet(privateKey, passphrase) {
  const salt = crypto.randomBytes(SALTLEN);
  const iv = crypto.randomBytes(IVLEN);
  const key = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITER, KEYLEN, 'sha256');
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  // Usar 'hex' como encoding de entrada
  let encrypted = cipher.update(privateKey, 'hex', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return {
    encryptedPrivateKey: encrypted,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptWallet(encryptedObj, passphrase) {
  const { encryptedPrivateKey, salt, iv, tag } = encryptedObj;
  const key = crypto.pbkdf2Sync(passphrase, Buffer.from(salt, 'base64'), PBKDF2_ITER, KEYLEN, 'sha256');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  // Usar 'hex' como encoding de salida
  let decrypted = decipher.update(encryptedPrivateKey, 'base64', 'hex');
  decrypted += decipher.final('hex');
  return decrypted;
}

