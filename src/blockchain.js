"use strict";
// Clase Blockchain va ha crear la estructura de bloques encadenados.
// Los métodos de la clase Blockchain se dividen:
// los que gestionan y modifican el estado de la cadena
//  y los que solo consultan o validan su integridad.

import { Block } from "./block.js";
import path from "path";
import fs from "fs";
import { writeBlockToFile, readBlockSeq } from "../storage/blockFile.js";
// Si no tienes utxomanager.js, puedes eliminar esta línea o dejarla para futuro
// import { UTXOManager } from "./utxomanager.js"; // ✅ Importamos el gestor de salidas no gastadas (UTXO)

class Blockchain {
  constructor(options = {}) {
    // Ruta por defecto para archivo binario de bloques
    this.blockFilePath = options.blockFilePath || path.resolve("storage", "data", "blk00000.dat");
    this.chain = [];
    this.utxoSet = [];
    this._initialized = false;
  }

  filterSpendableTransactions(transactions = []) {
    const candidates = Array.isArray(transactions) ? transactions : [];
    // Creamos un mapa de UTXOs disponibles para acceso rápido
    const availableUtxos = new Map(
      (Array.isArray(this.utxoSet) ? this.utxoSet : []).map((utxo) => [
        `${utxo.txId}:${utxo.outputIndex}`,
        utxo,
      ])
    );
    const consumedInBlock = new Set();

    return candidates.filter((transaction) => {
      if (!transaction || !Array.isArray(transaction.outputs) || transaction.outputs.length === 0) {
        return false;
      }

      if (!Array.isArray(transaction.inputs) || transaction.inputs.length === 0) {
        return true;
      }

      const isSpendable = transaction.inputs.every((input) => {
        const utxoKey = `${input.txId}:${input.outputIndex}`;
        const matchingUtxo = availableUtxos.get(utxoKey);

        if (!matchingUtxo) {
          console.warn(`[BLOCKCHAIN][UTXO] Ignorando tx ${transaction.id}: input ${utxoKey} no existe o ya fue gastado.`);
          return false;
        }

        if (consumedInBlock.has(utxoKey)) {
          console.warn(`[BLOCKCHAIN][UTXO] Ignorando tx ${transaction.id}: input ${utxoKey} ya consumido en este bloque.`);
          return false;
        }

        if (matchingUtxo.address !== input.address || matchingUtxo.amount !== input.amount) {
          console.warn(`[BLOCKCHAIN][UTXO] Ignorando tx ${transaction.id}: input ${utxoKey} no coincide con el UTXO actual.`);
          return false;
        }

        return true;
      });

      if (!isSpendable) {
        return false;
      }

      transaction.inputs.forEach((input) => {
        consumedInBlock.add(`${input.txId}:${input.outputIndex}`);
      });

      return true;
    });
  }

  /**
   * Inicializa la blockchain: carga desde archivo binario o crea génesis si no existe.
   */
  async initialize() {
    // Si ya está inicializada, no repetir
    if (this._initialized) return;
    this.chain = [];
    this.utxoSet = [];

    let loaded = false;
    try {
      await readBlockSeq(this.blockFilePath, (block) => {
        this.chain.push(block);
        this.updateUTXOSet(block);
        loaded = true;
      });
      console.log("[Blockchain] Loaded", this.chain.length, "blocks from file");
    } catch (err) {
      // Si el archivo no existe, crear génesis
      if (err.code === 'ENOENT') {
        console.log("[Blockchain] No blockchain file found, will create genesis");
      } else {
        // Archivo corrupto: mover a backup y empezar de cero
        console.error("[Blockchain] Error loading blockchain file:", err.message);
        console.log("[Blockchain] Moving corrupted file to backup and starting fresh");
        try {
          const backupPath = this.blockFilePath + '.corrupted.' + Date.now();
          await fs.promises.rename(this.blockFilePath, backupPath);
          console.log("[Blockchain] Corrupted file backed up to:", backupPath);
        } catch (renameErr) {
          console.error("[Blockchain] Could not backup corrupted file:", renameErr.message);
        }
      }
    }
    if (!loaded) {
      const genesis = Block.getGenesisBlock();
      this.chain = [genesis];
      this.utxoSet = [];
      this.updateUTXOSet(genesis);
      // Guardar génesis en disco
      await writeBlockToFile(this.blockFilePath, genesis);
      console.log("[Blockchain] Genesis block created and saved");
    }
    this._initialized = true;
    console.log("Blockchain initialized (persisted):", this.chain.length, "blocks");
  }

  // Nos devuelve el último bloque de la cadena
  getPreviousBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Añade un nuevo bloque a la cadena, actualiza UTXO y lo persiste en disco
  async addBlock(data) {
    await this.initialize();
    console.log("Añadiendo nuevo bloque a la cadena...");
    const safeTransactions = this.filterSpendableTransactions(data);
    const newBlock = Block.mineBlock(this.getPreviousBlock(), safeTransactions);
    this.chain.push(newBlock);
    this.updateUTXOSet(newBlock);
    await writeBlockToFile(this.blockFilePath, newBlock);
    return newBlock;
  }

  // Actualiza el UTXOset clásico (modelo UTXO correcto con txId y outputIndex)
  updateUTXOSet(block) {
    if (!this.utxoSet) this.utxoSet = [];
    const txs = Array.isArray(block?.data) ? block.data : [];
    // 1. Elimina los UTXOs gastados por las transacciones del bloque
    txs.forEach(transaction => {
      if (transaction.inputs && Array.isArray(transaction.inputs)) {
        transaction.inputs.forEach(input => {
          const utxosEliminados = this.utxoSet.filter(
            utxo => utxo.txId === input.txId && utxo.outputIndex === input.outputIndex
          );
          if (utxosEliminados.length > 0) {
            console.log(`[UTXO ELIMINADO]`, utxosEliminados);
          }
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
    txs.forEach(transaction => {
      if (Array.isArray(transaction.outputs)) {
        transaction.outputs.forEach((output, idx) => {
          const exists = this.utxoSet.some(
            (u) => u.txId === transaction.id && u.outputIndex === idx
          );
          if (!exists) {
            this.utxoSet.push({
              txId: transaction.id,
              outputIndex: idx,
              amount: output.amount,
              address: output.address,
            });
          }
        });
      }
    });
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

  // Reemplaza la cadena actual por una nueva si es más larga y válida, y reconstruye el UTXO Set y el archivo binario
  async replaceChain(newChain) {
    await this.initialize();
    console.log("[REPLACECHAIN][DEBUG] Received chain length:", newChain.length);
    console.log("[REPLACECHAIN][DEBUG] Current chain length:", this.chain.length);
    if (newChain.length <= this.chain.length) {
      console.log("[REPLACECHAIN][INFO] Received chain is not longer than the current chain.");
      return false;
    }
    if (!this.isValidChain(newChain)) {
      console.log("[REPLACECHAIN][WARN] The received chain is not valid.");
      return false;
    }
    console.log("[REPLACECHAIN][INFO] Replacing the current chain with the new chain (memoria)");
    this.chain = newChain;

    // === DETECCIÓN DE EVENTOS BURN EN REPLACECHAIN ===
    try {
      console.log("[REPLACECHAIN][BURN] Escaneando nuevos bloques para detectar eventos BURN...");

      for (const block of newChain) {
        if (!Array.isArray(block.data)) continue;

        for (const tx of block.data) {
          if (!Array.isArray(tx.outputs)) continue;

          for (const output of tx.outputs) {

            // Detectar dirección BURN
            if (
              typeof output.address === "string" &&
              output.address.startsWith("0x0000000000000000000000000000000000000000")
            ) {

              console.log(`[REPLACECHAIN][BURN] Evento BURN detectado en bloque ${block.hash}`);

              // Extraer bodegaId del sufijo de la dirección BURN
              const bodegaId = output.address.slice(42);

              // Extraer wallet del winelover del primer input
              const wineloverWallet = tx.inputs?.[0]?.address || null;

              const amount = output.amount;
              const fecha = block.timestamp || new Date().toISOString();

              // === Registrar en BD ===
              try {
                const BurnEvent = (await import("../app/models/BurnEvent.js")).default;

                // Evitar duplicados
                const exists = await BurnEvent.findOne({
                  where: { tx_id: tx.id }
                });

                if (!exists) {
                  await BurnEvent.create({
                    tx_id: tx.id,
                    burn_address: output.address,
                    amount: output.amount
                  });

                  console.log(`[REPLACECHAIN][BURN][DB] Evento BURN registrado en BD para tx ${tx.id}`);
                } else {
                  console.log(`[REPLACECHAIN][BURN][DB] Evento BURN ya existía en BD, no se duplica.`);
                }
              } catch (err) {
                console.error("[REPLACECHAIN][BURN][DB] Error registrando evento BURN:", err);
              }

              // === Emitir notificación WS ===
              try {
                if (typeof global.p2pServer?.broadcastBurnNotification === "function") {
                  global.p2pServer.broadcastBurnNotification({
                    txId: tx.id,
                    bodegaId,
                    wineloverWallet,
                    amount,
                    fecha
                  });

                  console.log(`[REPLACECHAIN][BURN][WS] Notificación BURN emitida a peers.`);
                }
              } catch (err) {
                console.error("[REPLACECHAIN][BURN][WS] Error emitiendo notificación BURN:", err);
              }

              // === Enviar email (opcional) ===
              try {
                const { sendEmail } = await import("../app/utils/sendEmail.js");
                const User = (await import("../app/models/User.js")).default;

                const winery = await User.findByPk(bodegaId);

                if (winery?.email) {
                  await sendEmail({
                    to: winery.email,
                    subject: "Nuevo evento BURN detectado",
                    text: `Se ha quemado un token.\nTx: ${tx.id}\nCantidad: ${amount}\nFecha: ${fecha}`,
                    html: `
                      <p>Se ha quemado un token asociado a tu bodega.</p>
                      <p><strong>Tx:</strong> ${tx.id}</p>
                      <p><strong>Cantidad:</strong> ${amount}</p>
                      <p><strong>Fecha:</strong> ${fecha}</p>
                    `
                  });

                  console.log(`[REPLACECHAIN][BURN][EMAIL] Email enviado a ${winery.email}`);
                }
              } catch (err) {
                console.error("[REPLACECHAIN][BURN][EMAIL] Error enviando email:", err);
              }
            }
          }
        }
      }

      console.log("[REPLACECHAIN][BURN] Escaneo completado.");
    } catch (err) {
      console.error("[REPLACECHAIN][BURN] Error general en detección de BURN:", err);
    }

    this.utxoSet = [];
    this.chain.forEach((block, idx) => {
      console.log(`[REPLACECHAIN][UTXO] Actualizando UTXO con bloque #${idx} (hash: ${block.hash})`);
      this.updateUTXOSet(block);
    });
    // Sobrescribe el archivo binario con la nueva cadena
    try {
      const fs = await import('fs');
      console.log('[REPLACECHAIN][DISK] Truncando archivo de bloques:', this.blockFilePath);
      await fs.promises.writeFile(this.blockFilePath, Buffer.alloc(0)); // Truncar
      for (const [idx, block] of this.chain.entries()) {
        await writeBlockToFile(this.blockFilePath, block);
        console.log(`[REPLACECHAIN][DISK] Bloque #${idx} persistido. Hash: ${block.hash}`);
      }
      console.log("[REPLACECHAIN][SUCCESS] Chain replaced and persisted successfully. Memoria y disco alineados.");
      return true;
    } catch (err) {
      console.error('[REPLACECHAIN][ERROR] Error al persistir la cadena en disco:', err);
      return false;
    }
  }
}

export { Blockchain };