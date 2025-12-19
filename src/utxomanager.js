// UTXOManager.js
"use strict";

/**
 * Adaptar un UTXO Set a tu proyecto es totalmente viable y además muy recomendable
 * si estás buscando eficiencia y escalabilidad.
 * De hecho, tu lógica actual ya se basa en outputs,
 * lo que significa que estás bastante cerca de un modelo UTXO funcional.
 * Lo que te falta es mantener un UTXO Set persistente y actualizado,
 * que te permita calcular el balance sin recorrer toda la blockchain.
 */

class UTXOManager {
  constructor() {
    // Mapa que asocia cada dirección con sus salidas no gastadas (UTXOs)
    this.utxoSet = {};
  }

  /**
   * 🔄 Actualiza el UTXO Set con un nuevo bloque minado.
   * Este método debe llamarse cada vez que se añade un bloque a la blockchain.
   * Elimina las salidas gastadas y añade las nuevas salidas generadas.
   */
  updateWithBlock(block) {
    const transactions = Array.isArray(block?.data)
      ? block.data
      : Array.isArray(block?.data?.transactions)
        ? block.data.transactions
        : [];

    transactions.forEach((tx) => {
      // Eliminar UTXOs gastados por los inputs de la transacción
      if (Array.isArray(tx.inputs)) {
        tx.inputs.forEach((input) => {
          // Buscar la dirección en el utxoSet que tenga el UTXO gastado
          Object.keys(this.utxoSet).forEach((addr) => {
            this.utxoSet[addr] = this.utxoSet[addr].filter(
              (utxo) => !(utxo.txId === input.txId && utxo.outputIndex === input.outputIndex)
            );
          });
        });
      }

      // Añadir nuevos UTXOs generados en los outputs
      if (Array.isArray(tx.outputs)) {
        tx.outputs.forEach((output, outputIndex) => {
          if (!Array.isArray(this.utxoSet[output.address])) {
            this.utxoSet[output.address] = [];
          }
          // Prevent duplicate UTXOs
          const exists = this.utxoSet[output.address].some(
            (utxo) => utxo.txId === tx.id && utxo.outputIndex === outputIndex
          );
          if (!exists) {
            this.utxoSet[output.address].push({
              txId: tx.id, // ahora es hash
              amount: output.amount,
              inputs: tx.inputs || [],
              outputIndex,
            });
          }
        });
      }
    });
  }

  /**
   * 📊 Obtener el balance actual de una dirección.
   * Este método permite calcular el balance sin recorrer la blockchain.
   */
  getBalance(address) {
    const utxos = Array.isArray(this.utxoSet[address]) ? this.utxoSet[address] : [];
    return utxos.reduce((acc, utxo) => acc + utxo.amount, 0);
  }

  /**
   * 📜 Obtener los UTXOs disponibles para una dirección.
   * Útil para mostrar salidas disponibles o construir transacciones.
   */
  getUTXOs(address) {
    return Array.isArray(this.utxoSet[address]) ? this.utxoSet[address] : [];
  }

  /**
   * 🧪 Verificar si una dirección tiene actividad en el UTXO Set.
   * Esto no recorre la blockchain, solo consulta el estado actual.
   */
  hasActivity(address) {
    return Array.isArray(this.utxoSet[address]) && this.utxoSet[address].length > 0;
  }
}

export { UTXOManager };
