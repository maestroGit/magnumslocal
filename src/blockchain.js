"use strict";
// Clase Blockchain va ha crear la estructura de bloques encadenados.
// Los métodos de la clase Blockchain se dividen:
// los que gestionan y modifican el estado de la cadena
//  y los que solo consultan o validan su integridad.

import { Block } from "./block.js";
// Si no tienes utxomanager.js, puedes eliminar esta línea o dejarla para futuro
// import { UTXOManager } from "./utxomanager.js"; // ✅ Importamos el gestor de salidas no gastadas (UTXO)

class Blockchain {
  constructor() {
    // Inicializamos la cadena con el bloque génesis
    this.chain = [Block.getGenesisBlock()];
    console.log("Blockchain initialized:", this.chain);

    // ✅ Inicializamos el UTXO set como array vacío
    this.utxoSet = [];

    // ✅ Actualizamos el UTXO Set con el bloque génesis (aunque normalmente no tiene transacciones)
    this.updateUTXOSet(this.chain[0]);
  }

  // Nos devuelve el último bloque de la cadena
  getPreviousBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Añade un nuevo bloque a la cadena y actualiza el UTXO Set
  addBlock(data) {
    console.log("Añadiendo nuevo bloque a la cadena...");
    const newBlock = Block.mineBlock(this.getPreviousBlock(), data);
    this.chain.push(newBlock);

    // ✅ Actualizamos el UTXO Set con las transacciones del nuevo bloque
    this.updateUTXOSet(newBlock);

    return newBlock;
  }

  // Actualiza el UTXOset clásico (modelo UTXO correcto con txId y outputIndex)
  updateUTXOSet(block) {
    // Asegúrate de tener un array para el UTXOset en tu blockchain, por ejemplo: this.utxoSet = []
    if (!this.utxoSet) this.utxoSet = [];

    // 1. Elimina los UTXOs gastados por las transacciones del bloque
    block.data.forEach(transaction => {
      // Para cada input (excepto las transacciones de recompensa, que no tienen inputs)
      if (transaction.inputs && Array.isArray(transaction.inputs)) {
        transaction.inputs.forEach(input => {
          // Log antes de eliminar
          const utxosEliminados = this.utxoSet.filter(
            utxo => utxo.txId === input.txId && utxo.outputIndex === input.outputIndex
          );
          if (utxosEliminados.length > 0) {
            console.log(`[UTXO ELIMINADO]`, utxosEliminados);
          }
          // Elimina el UTXO gastado usando txId y outputIndex
          this.utxoSet = this.utxoSet.filter(
            utxo =>
              !(
                utxo.txId === input.txId &&
                utxo.outputIndex === input.outputIndex
              )
          );
        });
      }
    });

    // 2. Añade los nuevos outputs de cada transacción como nuevos UTXOs
    block.data.forEach(transaction => {
      transaction.outputs.forEach((output, idx) => {
        // Evitar duplicados: comprobar si ya existe este txId+outputIndex
        const exists = this.utxoSet.some(
          (u) => u.txId === transaction.id && u.outputIndex === idx
        );
        if (!exists) {
          this.utxoSet.push({
            txId: transaction.id,
            outputIndex: idx, // <-- Añade el índice del output
            amount: output.amount,
            address: output.address,
          });
        } else {
          // Para depuración: opcional, eliminar o comentar en producción
          // console.debug(`UTXO already exists for ${transaction.id} #${idx}`);
        }
      });
    });

    // Opcional: log para depuración
    console.log("UTXOset actualizado:", this.utxoSet);
  }

  // Valida la cadena de bloques
  isValidChain(chain) {
    // Valida que el bloque génesis es identico a la cadena recibida por parámetro
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.getGenesisBlock())) {
      console.log("The genesis block is invalid");
      console.log(JSON.stringify(chain[0]) + JSON.stringify(Block.getGenesisBlock()));
      return false;
    }
    console.log("Genesis es el primer bloque");

    // Validamos el resto de bloques de la cadena
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      console.log(`block de chain${chain[i]}`);
      console.log(block);
      const previousBlock = chain[i - 1];

      // Verificar que el previousHash del bloque actual no sea diferente al hash del bloque anterior
      if ((block.previousHash !== previousBlock.hash)) {
        console.log(block.previousHash);
        console.log(previousBlock.hash);
        console.log("Previous hash does not equal");
        return false;
      }

      // Verificar que el hash del bloque actual es correcto y se ha calculado bien.
      if (block.hash !== Block.hash(block.timestamp, block.previousHash, block.data, block.nonce, block.difficulty)) {
        console.log(`Error: El hash del bloque ${i} no es correcto.`);
        return false;
      }

      console.log("Previus hash is equal");
    }

    console.log("Todos los bloques son válidos.");
    return true;
  }

  // Reemplaza la cadena actual por una nueva si es más larga y válida, y reconstruye el UTXO Set
  replaceChain(newChain) {
    console.log("Received chain length:", newChain.length);
    console.log("Current chain length:", this.chain.length);
    if (newChain.length <= this.chain.length) {
      console.log("Received chain is not longer than the current chain.");
      return;
    }
    if (!this.isValidChain(newChain)) {
      console.log("The received chain is not valid.");
      return;
    }
    console.log("Replacing the current chain with the new chain.");
    this.chain = newChain;

    // ✅ Reconstruimos el UTXO Set desde cero usando la nueva cadena
    this.utxoSet = [];
    this.chain.forEach((block) => this.updateUTXOSet(block));

    console.log("Chain replaced successfully.");
  }
}

export { Blockchain };