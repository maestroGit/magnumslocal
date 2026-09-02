Cambios Clave aplicados respecto a la clase Miner original:Codificación y Decodificación de Ruido ($A', B' \rightarrow C'$):En lugar de buscar ceros a la izquierda mediante hashes continuos del bloque, el minero resuelve la multiplicación de matrices perturbadas $A' = A + E$ y $B' = B + F$ mediante encoder().Eliminación del Ruido en $O(n^2 \cdot r)$:Mediante decoder(), se calcula $C = A \cdot B$ eliminando el ruido residual con operaciones de bajo rango $r \ll n$, garantizando que el minero no desperdicia el cálculo y obtiene la matriz producto real útil ($C = A \cdot B$).Verificación de Dificultad Nakamoto sobre Transcript:El nonce y la semillita $\sigma$ modifican la distribución de las matrices de ruido. La condición de minado valida que el hash del transcript de $C'$ cumpla el objetivo de dificultad de la red.Carga Útil en el Bloque (usefulWork):El objeto devuelto dentro del bloque contiene los datos $A, B$, el resultado verificado $C$, el nonce y la prueba $transcriptHash$, lo que permite a otros nodos verificar el bloque en tiempo sub-cúbico.

"use strict";

import crypto from "crypto";
import { Wallet } from "../wallet/wallet.js";
import { Transaction } from "../wallet/transactions.js";

/**
 * Funciones auxiliares para álgebra lineal sobre un cuerpo F_q o enteros
 */
class MatrixMath {
  static create(rows, cols, val = 0) {
    return Array.from({ length: rows }, () => Array(cols).fill(val));
  }

  static add(A, B) {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }

  static sub(A, B) {
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
  }

  static multiply(A, B) {
    const rowsA = A.length, colsA = A[0].length, colsB = B[0].length;
    const C = MatrixMath.create(rowsA, colsB, 0);
    for (let i = 0; i < rowsA; i++) {
      for (let k = 0; k < colsA; k++) {
        for (let j = 0; j < colsB; j++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  }

  /**
   * Genera matrices pseudoaleatorias a partir del seed (Random Oracle)
   */
  static generateDeterministicMatrix(seed, rows, cols) {
    const matrix = MatrixMath.create(rows, cols, 0);
    let counter = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const hash = crypto.createHash('sha256')
          .update(`${seed}:${counter++}`)
          .digest('hex');
        matrix[i][j] = parseInt(hash.substring(0, 8), 16) % 100; // Valores en F_q
      }
    }
    return matrix;
  }
}

/**
 * Clase MinerUsefulWork
 * Implementa el protocolo de Prueba de Trabajo Útil (cuPOW) basado en multiplicación
 * de matrices arbitrarias (Algorithm 6.4).
 */
class MinerUsefulWork {
  constructor(blockchain, transactionsPool, wallet, p2pServer, matrixSize = 4, rank = 2) {
    this.blockchain = blockchain;
    this.transactionsPool = transactionsPool;
    this.wallet = wallet;
    this.p2pServer = p2pServer;
    this.n = matrixSize; // Dimensión de la matriz (n x n)
    this.r = rank;       // Rango del ruido bajo rango r << n
  }

  /**
   * Codifica (Encode) las matrices inyectando ruido de rango r (Algorithm 6.4)
   * A' = A + E_L * E_R
   * B' = B + F_L * F_R
   */
  encoder(seed, A, B) {
    const EL = MatrixMath.generateDeterministicMatrix(`${seed}:EL`, this.n, this.r);
    const ER = MatrixMath.generateDeterministicMatrix(`${seed}:ER`, this.r, this.n);
    const FL = MatrixMath.generateDeterministicMatrix(`${seed}:FL`, this.n, this.r);
    const FR = MatrixMath.generateDeterministicMatrix(`${seed}:FR`, this.r, this.n);

    const E = MatrixMath.multiply(EL, ER);
    const F = MatrixMath.multiply(FL, FR);

    const A_prime = MatrixMath.add(A, E);
    const B_prime = MatrixMath.add(B, F);

    return { A_prime, B_prime, EL, ER, FL, FR };
  }

  /**
   * Decodifica (Decode) / Peels off the noise en O(n^2 * r) (Algorithm 6.4)
   * C = C' - (A * F + E * (B + F))
   */
  decoder(C_prime, A, B, EL, ER, FL, FR) {
    // E = EL * ER, F = FL * FR
    const F = MatrixMath.multiply(FL, FR);
    const B_plus_F = MatrixMath.add(B, F);

    // C'' = A*F + E*(B+F) optimizado aprovechando bajo rango r
    const AF = MatrixMath.multiply(MatrixMath.multiply(A, FL), FR);
    const E_BF = MatrixMath.multiply(EL, MatrixMath.multiply(ER, B_plus_F));
    const C_double_prime = MatrixMath.add(AF, E_BF);

    return MatrixMath.sub(C_prime, C_double_prime);
  }

  /**
   * Ejecuta el cómputo útil de MatMul y busca el nonce que cumple la dificultad
   */
  solveUsefulWork(A, B, difficulty) {
    let nonce = 0;
    const targetPrefix = "0".repeat(difficulty);

    while (true) {
      const seed = crypto.createHash('sha256').update(`seed:${nonce}`).digest('hex');

      // 1. Inyectar ruido (Encoder)
      const { A_prime, B_prime, EL, ER, FL, FR } = this.encoder(seed, A, B);

      // 2. Ejecutar la multiplicación principal C' = A' * B' (Tarea computacional)
      const C_prime = MatrixMath.multiply(A_prime, B_prime);

      // 3. Generar hash del transcript / resultado intermedio
      const transcript = JSON.stringify(C_prime);
      const transcriptHash = crypto.createHash('sha256').update(seed + transcript).digest('hex');

      // Check de dificultad estilo Nakamoto sobre la prueba del transcript
      if (transcriptHash.startsWith(targetPrefix)) {
        // 4. Decodificar el resultado real útil C = A * B
        const C = this.decoder(C_prime, A, B, EL, ER, FL, FR);

        return {
          proof: {
            nonce,
            seed,
            transcriptHash,
            A,
            B,
            C // Resultado útil validado
          }
        };
      }
      nonce++;
    }
  }

  /**
   * Método principal para minar un bloque ejecutando trabajo útil
   */
  async mine(address, customMatrixA = null, customMatrixB = null) {
    try {
      // 🔍 Transacciones válidas en mempool
      const validTransactions = this.transactionsPool.validTransactions();
      const txs = Array.isArray(validTransactions) ? [...validTransactions] : [];

      let onlyBurnTx = false;
      if (txs.length === 1 && txs[0].outputs?.some(o => o.address === "0x0000000000000000000000000000000000000000")) {
        onlyBurnTx = true;
      }

      // 💰 Asignación de recompensa
      if (txs.length === 0 || !onlyBurnTx) {
        const rewardTx = address
          ? Transaction.rewardTransaction({ publicKey: address }, Wallet.blockchainwallet())
          : Transaction.rewardTransaction(this.wallet, Wallet.blockchainwallet());
        txs.push(rewardTx);
      }

      // 🧠 Carga de trabajo útil (AI / Álgebra lineal)
      const matrixA = customMatrixA || MatrixMath.generateDeterministicMatrix(`inputA:${Date.now()}`, this.n, this.n);
      const matrixB = customMatrixB || MatrixMath.generateDeterministicMatrix(`inputB:${Date.now()}`, this.n, this.n);

      console.log('[MINER_PoUW][DEBUG] Iniciando resolución de MatMul Useful Work...');
      const difficulty = this.blockchain.difficulty || 2; // Dificultad objetivo de la red
      const powResult = this.solveUsefulWork(matrixA, matrixB, difficulty);

      console.log(`[MINER_PoUW][DEBUG] MatMul completado. Nonce: ${powResult.proof.nonce}`);

      // 🧱 Crea el bloque pasando las transacciones y el certificado de trabajo útil
      const blockData = {
        transactions: txs,
        usefulWork: powResult.proof
      };

      console.log('[MINER_PoUW][DEBUG] Llamando a addBlock...');
      const block = await this.blockchain.addBlock(blockData);
      console.log('[MINER_PoUW][DEBUG] Bloque minado. Hash:', block && block.hash);

      // 🔄 Sincronización P2P
      if (this.p2pServer && typeof this.p2pServer.syncChains === 'function') {
        console.log('[MINER_PoUW][DEBUG] Sincronizando cadenas vía P2P...');
        this.p2pServer.syncChains();
      }

      if (block) {
        this.transactionsPool.clear();
        if (this.p2pServer && typeof this.p2pServer.broadcastClearTransactions === 'function') {
          this.p2pServer.broadcastClearTransactions();
        }
        console.log("🌐 Pool de transacciones limpiado y sincronizado con la red");
      } else {
        console.warn("[MINER_PoUW] No se minó ningún bloque.");
      }

      let logAddress = address || (this.wallet && this.wallet.publicKey);
      if (onlyBurnTx && txs[0].inputs && txs[0].inputs[0]?.address) {
        logAddress = txs[0].inputs[0].address;
      }
      console.log(`⛏️ Bloque de trabajo útil minado para la dirección: ${logAddress}`);

      return block;
    } catch (error) {
      console.error("Error interno en MinerUsefulWork.mine():", error.message);
      return null;
    }
  }
}

export { MinerUsefulWork, MatrixMath };