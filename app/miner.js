"use strict";

import { Wallet } from "../wallet/wallet.js";
import { Transaction } from "../wallet/transactions.js";
//import { Blockchain } from "../src/blockchain.js";
//import { Block } from "../src/block.js"

// Class Miner
// responsable de validar las transacciones, minar nuevos bloques y añadirlos a la blockchain. También puede incluir recompensas en la wallet y sincronizar los datos minados con los otros nodos a través del P2PServer
class Miner {
  constructor(blockchain, transactionsPool, wallet, p2pServer) {
    this.blockchain = blockchain;
    this.transactionsPool = transactionsPool;
    this.wallet = wallet;
    this.p2pServer = p2pServer;
  }

  /**
   * Método para minar un nuevo bloque.
   *
   * Este método puede recibir una dirección opcional como parámetro.
   * Si se proporciona `address`, la recompensa del bloque se enviará a esa dirección.
   * Si no se proporciona, se usará la clave pública de la wallet local (`this.wallet.publicKey`).
   *
   * Esto permite flexibilidad: puedes minar localmente o desde el frontend especificando la dirección.
   */
  mine(address) {
    try {
      // 🔍 Al minar un bloque utilizamos transacciones válidas; si no hay, permitimos bloque solo con recompensa
      const validTransactions = this.transactionsPool.validTransactions();
      const txs = Array.isArray(validTransactions) ? [...validTransactions] : [];

      // Si el bloque solo contiene una transacción de burn, no se añade recompensa
      let onlyBurnTx = false;
      if (txs.length === 1) {
        const tx = txs[0];
        if (tx.outputs && tx.outputs.some(o => o.address === "0x0000000000000000000000000000000000000000")) {
          onlyBurnTx = true;
        }
      }

      // 💰 Regla de recompensa:
      // - Si no hay transacciones válidas en mempool -> crear bloque SOLO con reward
      // - Si hay transacciones y no es caso burn-only -> añadir reward
      if (txs.length === 0) {
        const rewardTx = address
          ? Transaction.rewardTransaction({ publicKey: address }, Wallet.blockchainwallet())
          : Transaction.rewardTransaction(this.wallet, Wallet.blockchainwallet());
        txs.push(rewardTx);
      } else if (!onlyBurnTx) {
        const rewardTx = address
          ? Transaction.rewardTransaction({ publicKey: address }, Wallet.blockchainwallet())
          : Transaction.rewardTransaction(this.wallet, Wallet.blockchainwallet());
        txs.push(rewardTx);
      }

      // 🧱 Crea un bloque con las transacciones válidas
      const block = this.blockchain.addBlock(txs);
      // 🔄 Sincroniza la cadena en el servidor P2P
      this.p2pServer.syncChains();

      // 🧹 Limpia el pool de transacciones
      this.transactionsPool.clear();

      // 📢 Notifica a todos los nodos sobre la sincronización (ya incluido en syncChains)
      let logAddress = address || this.wallet.publicKey;
      if (onlyBurnTx) {
        // Mostrar el publicKey del input de la transacción de burn
        const burnInput = txs[0].inputs && txs[0].inputs[0];
        if (burnInput && burnInput.address) {
          logAddress = burnInput.address;
        }
      }
      console.log("🌐 Pool de transacciones limpiado y sincronizado con la red");
      console.log(`⛏️ Minando bloque para dirección: ${logAddress}`);
      // ✅ Devuelve el bloque minado
      return block;
    } catch (error) {
      // 🧯 Captura cualquier error interno y lo muestra en consola
      console.error("Error interno en miner.mine():", error.message);
      return null; // Puedes lanzar el error si prefieres manejarlo en la ruta
    }
  }
}
export { Miner };
