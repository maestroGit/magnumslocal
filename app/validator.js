// Proof of Stake (PoS), 
// los validadores son seleccionados para crear nuevos bloques y validar transacciones en función de la cantidad de criptomoneda que poseen y están dispuestos a "apostar" (stake). 
// Implementación básica de una clase Validator para PoS:
// La clase Validator se inicializa con la blockchain, transactionsPool, wallet y p2pServer
"use strict";

import SHA256 from 'crypto-js/sha256.js';
import { Wallet } from "../wallet/index.js";
import { Transaction } from "../wallet/transactions.js";
import { ChainUtil } from "../wallet/chainUtils.js";
import { TransactionsPool } from '../wallet/transactionsPool.js';

class Validator {
  constructor(blockchain, transactionsPool, wallet, p2pServer) {
    this.blockchain = blockchain;
    this.transactionsPool = transactionsPool;
    this.wallet = wallet;
    this.p2pServer = p2pServer;
  }

  validate() {
    // Obtener transacciones válidas
    const validTransactions = this.transactionsPool.validTransactions();
    // Crear un bloque con las transacciones válidas
    const block = this.blockchain.addBlock(validTransactions);
    // Sincronizar la cadena en el servidor P2P
    this.p2pServer.syncChains();
    // Limpiar el transactionsPool
    this.transactionsPool.clear();
    // Informar a otros validadores para que limpien sus transactionsPool
    this.broadcastClearTransactions();
    return block;
  }

  broadcastClearTransactions() {
    this.p2pServer.broadcastClearTransactions();
  }

  // Para seleccionar un validador en un sistema de Proof of Stake (PoS), 
  // hay varios algoritmos y métodos que se pueden emplear. 
  // Método para seleccionar un validador en función del stake
  static ValidatorStake(validators) {
    console.log(validators);
    if (!validators || validators.length === 0) {
      throw new Error('No valid validators provided');
  }
    let totalStake = 0;
    validators.forEach((validator) => {
      totalStake += validator.stake;
    });
    console.log("Total Stake:", totalStake); // Verifica el total de stake
    if (totalStake === 0) {
        throw new Error('Total stake cannot be zero');
    }
    let random = Math.random() * totalStake;
    console.log("Random Value:", random); // Verifica el valor aleatorio generado
    for (const validator of validators) {
      console.log("Current Validator Stake:", validator.stake);
      if (random < validator.stake) {
        return validator;
      }
      random -= validator.stake;
    }
    console.log("Fallback Validator:", validators[validators.length - 1]);
    // Control final: si no se seleccionó ningún validador en el bucle, selecciona el último
    return validators[validators.length - 1];
  }

// Aleatoriedad Seguro con Recompensa (Secure Randomness with Reward) Descripción: Emplea funciones hash criptográficas para seleccionar validadores de manera segura y aleatoria
  static ValidatorRandom(validators) {
    console.log("select random: ",validators);
    // Concatenar las direcciones de todos los validadores
    let validatorAddresses = validators.map(v => v.address).join('');
    // Generar un hash basado en la concatenación
    const hash = SHA256(validatorAddresses).toString();
    // Convertir el hash a un número y usarlo para seleccionar el validador
    let index = parseInt(hash, 16) % validators.length;
    return validators[index];
  }

  static selectValidator(validators, currentIndex) {
    return validators[currentIndex % validators.length];
  }
  
}


export { Validator };

  // Rotación de Validadores (Validator Rotation) Descripción: 
  // Este enfoque rota los validadores en cada bloque o conjunto de bloques, asegurando equidad y distribución.
  // El uso del operador de módulo para seleccionar validadores en función de un índice creciente asegura una
  // Rotación Cíclica: Cada validador tiene la oportunidad de validar un bloque en un orden cíclico.
  // Distribución Uniforme: A largo plazo, todos los validadores tendrán la misma probabilidad de ser seleccionados para validar bloques, siempre y cuando el incremento de currentIndex sea constante y uniforme.
  // Supongamos que tienes 5 validadores en tu sistema (índices de 0 a 4). Aquí hay un ejemplo de cómo funciona el operador de módulo con el índice actual:
  // Si currentIndex es 0: 0 % 5 = 0 -> Se selecciona el validador en el índice 0.
  // Operador de Módulo (%): 𝑎 % 𝑛 devuelve el residuo de la división de 𝑎 por 𝑛
  // Si currentIndex es 1: 1 % 5 = 1 -> Se selecciona el validador en el índice 1.
  // Si currentIndex es 5: 5 % 5 = 0 -> Se selecciona el validador en el índice 0 (reinicio).
  // Si currentIndex es 6: 6 % 5 = 1 -> Se selecciona el validador en el índice 1.
  // Y así sucesivamente...
  // Para cualquier valor de currentIndex, currentIndex % validators.length siempre estará en el rango de 0 a validators.length - 1
  // Este enfoque garantiza una rotación cíclica y equitativa de validadores. 
  // Cuando currentIndex llega a un múltiplo de la longitud de la lista de validadores (por ejemplo, 5, 10, 15, etc.), el índice se reinicia a 0.
  // rotación modular o rotación circular
  // Fundamento Matemático: Aritmética Modular
  // La aritmética modular es un sistema de aritmética para números enteros, donde los números "vuelven a empezar" desde cero después de alcanzar un cierto valor llamado el "módulo". 
  // Es como un reloj en el cual, después de llegar a 12 (o 24), vuelve a 1 (o 0).
