// Crear una wallet, guardar las claves en un USB, y luego 
// reconstruir una wallet funcional capaz de firmar transacciones directamente desde ese archivo

import fs from 'fs';
import path from 'path';
import SHA256 from 'crypto-js/sha256.js'; // Importar SHA256 desde crypto-js
import elliptic from "elliptic";
import { v1 as uuidv1 } from "uuid";

const { ec: EC } = elliptic;
const ec = new EC("secp256k1"); // secp256k1 es una curva elíptica comúnmente utilizada en blockchain

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

// 💾 Guardar claves en archivo JSON
const saveKeysToFile = (publicKey, privateKey, filePath) => {
  const keyPair = {
    publicKey: publicKey,
    privateKey: privateKey
  };
  fs.writeFileSync(filePath, JSON.stringify(keyPair, null, 2), 'utf8');
  console.log('✅ Par de claves guardado en el archivo keys.json en el USB');
};

// 📂 Leer claves desde archivo JSON
const loadKeysFromFile = (filePath) => {
  const keyPairData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(keyPairData);
};

// 🧠 Reconstruir wallet funcional desde archivo JSON
const reconstructWalletFromFile = (filePath) => {
  const loadedKeys = loadKeysFromFile(filePath);
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

// 📍 Ruta del archivo en el USB (ajústala según tu sistema)
const usbPath = 'D:\\keys.json';

// 🧪 Crear wallet nueva y guardar en USB
const wallet = createWallet();
console.log('🆕 Nueva wallet creada:');
console.log(`Clave pública: ${wallet.publicKey}`);
console.log(`Clave privada: ${wallet.privateKey}`);
console.log(`Balance inicial: ${wallet.balance}`);
saveKeysToFile(wallet.publicKey, wallet.privateKey, usbPath);

// 🔄 Leer y reconstruir wallet desde USB
const restoredWallet = reconstructWalletFromFile(usbPath);

// 🧾 Puedes ahora usar restoredWallet.keyPair.sign(dataHash) para firmar transacciones