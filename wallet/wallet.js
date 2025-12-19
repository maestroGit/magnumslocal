// Sugerir combinaciones de UTXOs que casen con el importe solicitado
// Devuelve un array de combinaciones posibles (cada una es un array de UTXOs)
// Solo considera UTXOs realmente disponibles (no bloqueados en mempool)
// ...existing code...
// wallet
"use strict";
import { INITIAL_BALANCE } from "../config/constantConfig.js";
import { ChainUtil } from "./chainUtils.js";
import { Transaction } from "./transactions.js";
import { TransactionsPool } from "./transactionsPool.js";
// para harderwallet method
import fs from "fs";
import path from "path";

// La clase Wallet es fundamental en cualquier implementación de blockchain,
// ya que representa una billetera digital que maneja claves públicas y privadas, balances,
// y la capacidad de firmar transacciones.
class Wallet {
  /**
   * Método estático: sugerir combinaciones de UTXOs que casen con el importe solicitado
   * Devuelve un array de combinaciones posibles (cada una es un array de UTXOs)
   * Solo considera UTXOs realmente disponibles (no bloqueados en mempool)
   */
  static coinSelectUTXO(utxoSet, amount) {
    try {
      const findCombos = (utxos, target, partial = [], results = []) => {
        const sum = partial.reduce((acc, u) => acc + u.amount, 0);
        if (sum >= target && partial.length > 0) {
          results.push([...partial]);
          return results;
        }
        for (let i = 0; i < utxos.length; i++) {
          findCombos(utxos.slice(i + 1), target, [...partial, utxos[i]], results);
        }
        return results;
      };
      const availableUtxos = utxoSet.filter(u => u.amount > 0);
      const combos = findCombos(availableUtxos, amount);
      combos.sort((a, b) => {
        const sumA = a.reduce((acc, u) => acc + u.amount, 0);
        const sumB = b.reduce((acc, u) => acc + u.amount, 0);
        return (sumA - amount) - (sumB - amount);
      });
      return combos;
    } catch (err) {
      console.error('[coinSelectUTXO] Error:', err);
      return [];
    }
  }

  /**
   * Método de instancia: sugerir combinaciones de UTXOs de esta wallet que casen con el importe solicitado
   * Filtra los UTXOs por la clave pública de la instancia
   */
  coinSelectUTXO(utxoSet, amount) {
    const myUtxos = Array.isArray(utxoSet)
      ? utxoSet.filter(u => u.address === this.publicKey && u.amount > 0)
      : [];
    return Wallet.coinSelectUTXO(myUtxos, amount);
  }
  // Inicializa el objeto Wallet con un balance inicial, genera un par de claves, y asigna la clave pública. //v55
  // El uso de existingPublicKey = null es solo una opción que ofrece flexibilidad. Si no se proporciona un argumento, el valor predeterminado null será utilizado. Esto permite que el constructor funcione correctamente en ambos casos: cuando se proporciona una clave pública existente y cuando no se proporciona ninguna clave.
  constructor(
    existingPublicKey = null,
    initialBalance = INITIAL_BALANCE,
    existingPrivateKey = null
  ) {
    // implementación realista en la que el balance inicial no se asigne de manera fija. Eliminar la dependencia de INITIAL_BALANCE
    // Asegurarte de que el balance se calcule siempre en función de las transacciones en la blockchain.
    // enfoque original, this.balance se inicia con un valor predefinido (INITIAL_BALANCE), mientras que en el nuevo enfoque, se inicia en 0 y se calcula dinámicamente a partir de las transacciones
    // this.balance = INITIAL_BALANCE;
    //this.balance = initialBalance; // Balance inicial proporcionado al crear la wallet

    if (existingPrivateKey) {
      // Si se proporciona clave privada, deriva el keyPair y la publicKey desde la privada
      this.privateKey = existingPrivateKey;
      this.keyPair = ChainUtil.genKeyPairFromPrivate(existingPrivateKey);
      this.publicKey = this.keyPair.getPublic().encode("hex");
      console.log('[Wallet.constructor] keyPair creado desde clave privada:');
      if (this.keyPair) {
        try {
          const pubHex = this.keyPair.getPublic() ? this.keyPair.getPublic().encode('hex') : null;
          const privHex = this.keyPair.getPrivate ? this.keyPair.getPrivate('hex') : null;
          console.log('[Wallet.constructor] keyPair.public (hex):', pubHex);
          console.log('[Wallet.constructor] keyPair.private (hex):', privHex);
        } catch (e) {
          console.error('[Wallet.constructor] Error mostrando keyPair:', e);
        }
      } else {
        console.error('[Wallet.constructor] keyPair es null tras crear desde clave privada');
      }
    } else if (existingPublicKey) {
      // Utiliza la clave pública existente proporcionada
      this.publicKey = existingPublicKey;
      // Podrías recuperar la clave privada de un lugar seguro si es necesario
      // this.keyPair = ... (recuperar par de claves basado en la clave pública existente)
      console.log('[Wallet.constructor] Solo clave pública proporcionada, no se genera keyPair.');
    } else {
      console.log("Generando KeyPair...");
      this.keyPair = ChainUtil.genKeyPair(); // Generar un par de claves
      this.publicKey = this.keyPair.getPublic().encode("hex"); // Obtener la clave pública. Deriva la clave pública de la clave privada y la codifica en hexadecimal.
      this.privateKey = this.keyPair.getPrivate("hex"); // Guardar la clave privada en hexadecimal
      console.log('[Wallet.constructor] keyPair generado aleatoriamente:');
      if (this.keyPair) {
        try {
          const pubHex = this.keyPair.getPublic() ? this.keyPair.getPublic().encode('hex') : null;
          const privHex = this.keyPair.getPrivate ? this.keyPair.getPrivate('hex') : null;
          console.log('[Wallet.constructor] keyPair.public (hex):', pubHex);
          console.log('[Wallet.constructor] keyPair.private (hex):', privHex);
        } catch (e) {
          console.error('[Wallet.constructor] Error mostrando keyPair:', e);
        }
      } else {
        console.error('[Wallet.constructor] keyPair es null tras generación aleatoria');
      }
    }
  }

  // Método para obtener la clave privada de la wallet (útil para exportar o debug)
  getPrivateKey() {
    return this.privateKey || "No private key loaded";
  }

  toString() {
    const balanceObj = this.calculateBalance(blockchain, this.publicKey);
    return `publickey:${this.publicKey}\nbalance:${balanceObj.balance}`;
  }

  sign(datahash) {
    // Firma una transacción usando la clave privada.
    return this.keyPair.sign(datahash);
  }

  // Metodo para crear una transacción através de la wallet. Depende de la instancia de la clase wallet (no es un método estático).
  // recipient/beneficiario: dirección de la wallet receptora.
  // La propia instancia de la clase wallet es el remitente del que sacamos los fondos.
  createTransaction(recipient, amount, blockchain, transactionsPool, utxoSet = []) {
    // Filtrar UTXOs bloqueados por transacciones pendientes en el mempool
    // 1. Obtener los UTXOs bloqueados (ya referenciados en inputs de transacciones pendientes)
    const blockedUtxos = [];
    for (const tx of transactionsPool.transactions) {
      if (Array.isArray(tx.inputs)) {
        for (const input of tx.inputs) {
          blockedUtxos.push(input.txId + ':' + input.outputIndex);
        }
      }
    }
    // 2. Filtrar el utxoSet para excluir los bloqueados
    const filteredUtxoSet = Array.isArray(utxoSet)
      ? utxoSet.filter(utxo => !blockedUtxos.includes(utxo.txId + ':' + utxo.outputIndex))
      : utxoSet;

    // Calculamos el balance de la wallet usando la función dinámica (no this.balance)
    const balanceObj = this.calculateBalance(blockchain, this.publicKey, filteredUtxoSet);
    const balance = balanceObj.balance; // Extraemos el saldo real calculado
    console.log("Balance calculado para transacción:", balance);

    if (amount > balance) {
      console.log(`Amount: ${amount} exceeds balance ${balance}`);
      return null;
    }
    // Antes de crear la transacción verificamos el balance real de nuestra cuenta
    console.log("create Transaction wallet: " + amount + " for: " + recipient);
    console.log(`Balance calculado para transacción: ${balance}`);

    // Comprobamos si el monto a transferir excede el saldo disponible
    if (amount > balance) {
      console.log(`Amount: ${amount} exceeds balance ${balance}`); // Mensaje claro de error
      return null; // Retornar null en caso de error por saldo insuficiente
    }
    console.log(`Amount: ${amount} ok for balance: ${balance}`);

    // Siempre crea una nueva transacción y la añade al pool
    const transaction = Transaction.newTransaction(this, recipient, amount, balance, filteredUtxoSet);
    if (transaction) {
      transactionsPool.updateOrAddTransaction(transaction);
    }
    return transaction;
  }

  // billetera especial que actúa como la billetera principal de la blockchain,
  // comúnmente conocida como "Coinbase Wallet" en muchos contextos de blockchain.
  // Esta billetera especial suele ser utilizada para gestionar las recompensas de los mineros o para actuar como la fuente de transacciones iniciales en la blockchain
  // y, por lo tanto, no tiene una clave privada asociada.
  // Al no tener clave privada, esta billetera no puede firmar transacciones.
  // Por lo tanto, cualquier transacción que provenga de esta billetera debe ser tratada con precaución y verificada cuidadosamente por los nodos de la red.
  // La función blockchainwallet() crea una instancia de Wallet con una clave pública fija y un alias especial.
  // Esta clave pública fija es conocida por todos los nodos en la red y se utiliza para identificar las transacciones que provienen de la "Coinbase Wallet".
  // Dado que esta billetera no tiene una clave privada, no puede firmar transacciones.
  // Por lo tanto, cualquier transacción que provenga de esta billetera debe ser verificada cuidadosamente por los nodos de la red para garantizar su validez.
  // Este enfoque ayuda a mantener la integridad y seguridad de la blockchain al tratar las transacciones de la "Coinbase Wallet" de manera especial.
  // La clave pública fija utilizada en este ejemplo es solo un ejemplo y debe ser reemplazada por una clave segura en un entorno real.
  // Esta clave pública fija es conocida por todos los nodos en la red y se utiliza para identificar las transacciones que provienen de la "Coinbase Wallet".
  // Esta wallet puede actuar como origen de fondos para inicializar otras wallets.
  static blockchainwallet() {
    const blockchainwallet = new this();
    blockchainwallet.address = " Coinbase Wallet"; // Alias no funcional, especial para la billetera de la blockchain
    // Asignar una clave pública fija para la billetera de la blockchain
    blockchainwallet.publicKey =
      "04bfcabf3c1d5e8e8f3c4e5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809";
    // La clave pública anterior es un ejemplo y debe ser reemplazada por una clave segura en un entorno real.
    return blockchainwallet;
  }

  // Método para cargar la clave pública desde un archivo
  loadPublicKeyFromUSB(usbPath) {
    try {
      console.log("usbPath", usbPath);
      this.publicKey = fs.readFileSync(usbPath, "utf8").trim();
      console.log(`Clave pública cargada desde ${usbPath}: ${this.publicKey}`);
    } catch (error) {
      console.error(`Error leyendo la clave pública desde ${usbPath}:`, error);
    }
  }

  // Cálculadora el balance de cualquier wallet
  // El balance de una cuenta es la suma de los outputs no gastados (UTXO) asociados a la dirección.
  // Calcula el balance de cualquier wallet recorriendo TODA la blockchain, incluyendo el bloque génesis.
  // Así, si el saldo inicial está en el génesis, también se suma correctamente.
  // Si se pasa un utxoSet actualizado, lo usa directamente para calcular el balance (más eficiente).
  // Si no, recorre la blockchain para calcular los UTXOs y el balance.
  calculateBalance(blockchain, address, utxoSet = []) {
    // Si tienes un UTXO set actualizado, úsalo directamente
    if (Array.isArray(utxoSet) && utxoSet.length > 0) {
      const balance = utxoSet
        .filter((utxo) => utxo.address === address)
        .reduce((sum, utxo) => sum + utxo.amount, 0);
      return {
        address,
        balance,
        message: `Balance calculado correctamente para ${address} (UTXO set)`,
      };
    }

    // Si no hay UTXO set, recorre la blockchain para calcular el balance (menos eficiente)
    let utxos = [];
    let spentInputs = [];

    blockchain.chain.forEach((block) => {
      block.data.forEach((transaction) => {
        // Marca los inputs gastados
        if (Array.isArray(transaction.inputs)) {
          transaction.inputs.forEach((input) => {
            if (input.address === address) {
              spentInputs.push({ txId: input.txId, outputIndex: input.outputIndex });
            }
          });
        }
        // Añade outputs que pertenecen a la dirección
        if (Array.isArray(transaction.outputs)) {
          transaction.outputs.forEach((output, idx) => {
            if (output.address === address) {
              utxos.push({
                txId: transaction.id,
                outputIndex: idx,
                amount: output.amount,
                address: output.address,
              });
            }
          });
        }
      });
    });

    // Filtra los UTXOs que no han sido gastados
    const unspent = utxos.filter(
      (utxo) =>
        !spentInputs.some(
          (input) => input.txId === utxo.txId && input.outputIndex === utxo.outputIndex
        )
    );
    const balance = unspent.reduce((sum, utxo) => sum + utxo.amount, 0);

    return {
      address,
      balance,
      message: `Balance calculado correctamente para ${address} (blockchain scan)`,
    };
  }
}

export { Wallet };