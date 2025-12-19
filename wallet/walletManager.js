// walletManager.js
// wallet/walletManager.js

import { Wallet } from "./wallet.js";
import { Transaction } from "./transactions.js";
import { INITIAL_BALANCE } from "../config/constantConfig.js";

// 🆕 Crear una wallet nueva
export const createWallet = () => {
  try {
    const wallet = new Wallet();
    return {
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
    };
  } catch (error) {
    console.error("❌ Error al crear la wallet:", error);
    return null;
  }
};

// ✅ Validar formato de clave pública
export const validatePublicKey = (pubKey) => {
  try {
    return typeof pubKey === "string" && pubKey.startsWith("04") && pubKey.length >= 130;
  } catch (error) {
    console.error("❌ Error al validar la clave pública:", error);
    return false;
  }
};

// ✍️ Firmar transacción desde una clave privada
export const signTransaction = (privateKey, recipient, amount, blockchain, pool) => {
  try {
    const tempWallet = new Wallet(null, 0);
    tempWallet.privateKey = privateKey;

    // Si tienes método para derivar la clave pública desde la privada
    if (typeof tempWallet.getPublicKeyFromPrivate === "function") {
      tempWallet.publicKey = tempWallet.getPublicKeyFromPrivate();
    } else {
      console.warn("⚠️ Método getPublicKeyFromPrivate() no disponible. Asegúrate de derivar la clave correctamente.");
      return null;
    }

    return tempWallet.createTransaction(recipient, amount, blockchain, pool);
  } catch (error) {
    console.error("❌ Error al firmar la transacción:", error);
    return null;
  }
};

// 🧮 Calcular balance desde clave pública
export const getBalance = (publicKey, blockchain) => {
  try {
    const tempWallet = new Wallet(publicKey, 0);
    return tempWallet.calculateBalance(blockchain, publicKey);
  } catch (error) {
    console.error("❌ Error al calcular el balance:", error);
    return { address: publicKey, balance: 0, message: "Error al calcular el balance" };
  }
};

// 🔄 Inicializar wallet con saldo inicia
// Esta función se llama solo una vez al iniciar la blockchain
// para asignar el saldo inicial a una wallet específica
// Asegúrate de llamar esto solo si la blockchain está vacía (solo bloque génesis)
// y si la wallet no ha sido inicializada antes
// para evitar duplicar la transacción de inicialización
// Puedes almacenar un flag en un archivo o base de datos para verificar
// si ya se ha hecho la inicialización
// Ejemplo: initWallet("tu_clave_publica_aqui", blockchain);
