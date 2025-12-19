// Crear una wallet, guardar las claves en un USB, y luego 
// reconstruir una wallet funcional capaz de firmar transacciones directamente desde ese archivo

import fs from 'fs';
import path from 'path';
import SHA256 from 'crypto-js/sha256.js'; // Importar SHA256 desde crypto-js
import elliptic from "elliptic";
import { v1 as uuidv1 } from "uuid";
import crypto from 'crypto';
import { promisify } from 'util';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';

const { ec: EC } = elliptic;
const ec = new EC("secp256k1"); // secp256k1 es una curva elíptica comúnmente utilizada en blockchain

// Cargar package.json en tiempo de ejecución (evita usar import assertions que muestran warnings)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _pkgPath = path.resolve(__dirname, '../../package.json');
let pkg = { version: '0.0.0' };
try {
  const _pkgRaw = await fs.promises.readFile(_pkgPath, 'utf8');
  pkg = JSON.parse(_pkgRaw);
} catch (err) {
  console.warn('No se pudo leer package.json para metadata; usando versión por defecto', err && err.message);
}

// 🔐 Generar un par de claves (clave pública y privada)
const genKeyPair = () => ec.genKeyPair();

// 🔁 Reconstruir un keyPair completo desde una clave privada en formato hexadecimal
const genKeyPairFromPrivate = (privateKeyHex) => ec.keyFromPrivate(privateKeyHex, "hex");

// 🏗️ Crear una nueva wallet con balance inicial y claves
const createWallet = () => {
  const balance = 500;
  const keyPair = genKeyPair();
  const publicKey = keyPair.getPublic().encode('hex');
  const privateKey = keyPair.getPrivate().toString('hex');
  return { balance, keyPair, publicKey, privateKey };
};

// � Derivar clave simétrica desde passphrase con scrypt (async)
const scryptAsync = promisify(crypto.scrypt);
const deriveKey = async (passphrase, salt) => {
  // salt: Buffer
  // devuelve Buffer de 32 bytes
  return await scryptAsync(passphrase, salt, 32);
};

// �💾 Guardar claves en archivo JSON con cifrado AES-256-GCM de la privateKey (async)
const saveKeysToFile = async (publicKey, privateKey, filePath, passphrase) => {
  if (!passphrase) throw new Error('Passphrase requerida para cifrar la clave privada');

  const salt = crypto.randomBytes(16); // salt para scrypt
  const iv = crypto.randomBytes(12); // IV recomendado para GCM: 12 bytes
  const key = await deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const out = {
    // Metadata
    keystoreVersion: 1,
    id: uuidv1(),
    createdAt: new Date().toISOString(),
    createdBy: `magnumsmaster v${pkg.version}`,
    // KDF / cipher metadata and encrypted payload
    kdf: 'scrypt',
    kdfParams: { salt: salt.toString('hex') },
    cipher: 'aes-256-gcm',
    cipherParams: { iv: iv.toString('hex'), tag: tag.toString('hex') },
    publicKey,
    encryptedPrivateKey: encrypted.toString('hex')
  };

  await fs.promises.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');
  console.log('✅ Par de claves (privada cifrada) guardado en', filePath);
};

// 📂 Leer claves desde archivo JSON (descifra la privateKey si está cifrada) (async)
const loadKeysFromFile = async (filePath, passphrase) => {
  const keyPairData = await fs.promises.readFile(filePath, 'utf8');
  const data = JSON.parse(keyPairData);

  if (data.encryptedPrivateKey) {
    if (!passphrase) throw new Error('Passphrase requerida para descifrar la clave privada');
    // soportar formatos antiguos y nuevos
    const saltHex = data.kdfParams?.salt || data.salt;
    const ivHex = data.cipherParams?.iv || data.iv;
    const tagHex = data.cipherParams?.tag || data.tag;
    const encryptedHex = data.encryptedPrivateKey;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const key = await deriveKey(passphrase, salt);
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return { publicKey: data.publicKey, privateKey: decrypted.toString('utf8') };
    } catch (err) {
      // error probable de auth tag => passphrase incorrecta o archivo corrupto
      const e = new Error('Error al descifrar: passphrase incorrecta o archivo corrupto');
      e.cause = err;
      throw e;
    }
  }

  return data;
};

// 🧠 Reconstruir wallet funcional desde archivo JSON
const reconstructWalletFromFile = async (filePath, passphrase) => {
  const loadedKeys = await loadKeysFromFile(filePath, passphrase);
  const keyPair = genKeyPairFromPrivate(loadedKeys.privateKey); // reconstruir keyPair completo
  const publicKey = keyPair.getPublic().encode("hex");

  // Validar coincidencia entre clave pública reconstruida y la guardada
  if (publicKey !== loadedKeys.publicKey) {
    console.warn("⚠️ Advertencia: la clave pública derivada no coincide con la guardada en el archivo");
  }

  const wallet = {
    keyPair,
    publicKey,
    privateKey: loadedKeys.privateKey,
    balance: 0 // el balance real se calculará desde la blockchain
  };

  console.log("🔓 Wallet reconstruida desde USB:");
  console.log(`Clave pública: ${wallet.publicKey}`);
  console.log(`Clave privada: ${wallet.privateKey}`);
  return wallet;
};

// 📍 Ruta del archivo en el USB / salida. Prioridad: CLI flag (--out / -o) > KEY_FILE_PATH env > por defecto
const getCliOutPath = () => {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '-o') {
      return argv[i + 1] || null;
    }
    if (a.startsWith('--out=')) {
      return a.split('=')[1] || null;
    }
  }
  return null;
};

// parse flags: --help, --create-dir
const getCliFlags = () => {
  const argv = process.argv.slice(2);
  const flags = { help: false, createDir: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') flags.help = true;
    if (a === '--create-dir') flags.createDir = true;
  }
  return flags;
};

const cliFlags = getCliFlags();
if (cliFlags.help) {
  console.log(`Usage:
  node wallet/test/hardwareWallet.js [--out <path>] [--create-dir] [--help]

Options:
  --out, -o <path>     Ruta de salida del backup (ej: D:\\keys.json)
  --create-dir         Crear directorio padre si no existe
  --help, -h           Muestra esta ayuda
`);
  process.exit(0);
}

const usbPath = getCliOutPath() || process.env.KEY_FILE_PATH || 'D:\\keys.json';

// Validar ruta de salida antes de guardar
const validateOutputPath = async (outPath, { createDir = false } = {}) => {
  const full = path.resolve(outPath);
  const dir = path.dirname(full);
  try {
    await fs.promises.access(dir, fs.constants.W_OK);
    return full;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      if (createDir) {
        await fs.promises.mkdir(dir, { recursive: true });
        return full;
      }
      const e = new Error(`El directorio '${dir}' no existe. Usa --create-dir para crearlo automáticamente o pasa otra ruta.`);
      e.code = 'NO_DIR';
      throw e;
    }
    const e = new Error(`No hay permisos de escritura para '${dir}' (error: ${err.code || err.message})`);
    e.code = 'NO_WRITE';
    throw e;
  }
};

// 🧪 Crear wallet nueva y guardar en USB (requiere KEY_PASSPHRASE env var o entrada interactiva)
const wallet = createWallet();
console.log('🆕 Nueva wallet creada:');
console.log(`Clave pública: ${wallet.publicKey}`);
console.log(`Clave privada (NO almacenada en claro): ${wallet.privateKey.slice(0,8)}...`);
console.log(`Balance inicial: ${wallet.balance}`);

// Helper to prompt for a hidden passphrase
const promptPassphrase = async (confirm = false) => {
  const rl = readline.createInterface({ input, output });
  try {
    const p1 = await rl.question('Introduce passphrase para cifrar/descifrar keys: ', { hideEchoBack: true });
    if (!p1) return null;
    if (confirm) {
      const p2 = await rl.question('Confirma la passphrase: ', { hideEchoBack: true });
      if (p1 !== p2) {
        console.error('Las passphrases no coinciden.');
        return null;
      }
    }
    return p1;
  } finally {
    rl.close();
  }
};

let passphrase = process.env.KEY_PASSPHRASE;
if (!passphrase) {
  console.warn('⚠️  KEY_PASSPHRASE no está definida. Te pediré una passphrase ahora (entrada oculta).');
  passphrase = await promptPassphrase(true);
  if (!passphrase) {
    console.error('Abortando: no se proporcionó passphrase. No se guardará el backup cifrado.');
    process.exit(1);
  }
}

// Intentar guardar en la ruta preferida (usbPath). Si no existe el directorio/drive,
// hacer fallback a 'keys.json' en el directorio actual para que el script funcione sin USB.
let finalPath = usbPath;
try {
  // validar ruta antes de intentar escribir; si falla, validateOutputPath lanzará
  finalPath = await validateOutputPath(finalPath, { createDir: cliFlags.createDir });
  await saveKeysToFile(wallet.publicKey, wallet.privateKey, finalPath, passphrase);
} catch (err) {
  if (err && (err.code === 'NO_DIR' || err.code === 'NO_WRITE' || err.code === 'ENOENT')) {
    const fallbackPath = path.resolve(process.cwd(), 'keys.json');
    console.warn(`⚠️  No se pudo escribir en '${finalPath}': ${err.message}. Probando fallback local: '${fallbackPath}'`);
    try {
      const fallbackFull = await validateOutputPath(fallbackPath, { createDir: true });
      await saveKeysToFile(wallet.publicKey, wallet.privateKey, fallbackFull, passphrase);
      finalPath = fallbackFull;
    } catch (err2) {
      console.error('Error al guardar las claves en el fallback local:', err2.message || err2);
      process.exit(1);
    }
  } else {
    console.error('Error al guardar las claves:', err.message || err);
    process.exit(1);
  }
}

// 🔄 Leer y reconstruir wallet desde archivo (usa la misma passphrase interactiva/ENV).
// Si la restauración falla por ENOENT en la ruta original, intentar el fallback local.
let restoredWallet;
try {
  restoredWallet = await reconstructWalletFromFile(finalPath, passphrase);
} catch (err) {
  if (err && err.code === 'ENOENT' && finalPath !== path.resolve(process.cwd(), 'keys.json')) {
    const fallbackPath = path.resolve(process.cwd(), 'keys.json');
    console.warn(`⚠️  No se encontró '${finalPath}'. Intentando restaurar desde fallback local: '${fallbackPath}'`);
    try {
      restoredWallet = await reconstructWalletFromFile(fallbackPath, passphrase);
    } catch (err2) {
      console.error('Error al restaurar wallet desde archivo (fallback):', err2.message || err2);
      process.exit(1);
    }
  } else {
    console.error('Error al restaurar wallet desde archivo:', err.message || err);
    process.exit(1);
  }
}

// 🧾 Puedes ahora usar restoredWallet.keyPair.sign(dataHash) para firmar transacciones