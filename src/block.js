"use strict";
// Importamos la librería crypto para calcular el hash
// Verificamos si la librería crypto está disponible
//import crypto from "crypto";
import { ChainUtil } from "../wallet/chainUtils.js";
// Importamos la constante DIFFICULTY desde constantConfig.js
import { DIFFICULTY, MINE_RATE } from "../config/constantConfig.js";
import fs from "fs";
import path from "path";
/*
 * Block class. BLocks are the fundamental part of the blockchain.
 * Blocks are created one after the other, containing information about the previous one in the hash that identifies the block.
 */
// Los datos que paseremos a la clase Block son un objeto que para poderlo convertirlo en un string ha ser posible hexadecimal.
// la función JSON.stringify() convierte un objeto JavaScript en una cadena JSON, que luego puedes almacenar o transmitir fácilmente
class Block {
  /*
   * When a block is created a hash for it has to be calculated. This hash contains the timestamp of creation, transactions to be recorded in the block,
   * and the hash of the previous block. The genesis block (Initial block of the chain) is the only case when we won't have a hash for the previous block.
   *
   */
  constructor(
    timestamp,
    previousHash,
    hash,
    data,   
    nonce,
    difficulty,
    processTime
  ) {
    // Propiedades del objeto class Block (NUESTRO BLOQUE) ¿¿¿Podría incluir un index para saber la posición del bloque en la cadena???
    this.timestamp = timestamp; // momento de creación del bloque en la que se añadió a la cadena
    this.previousHash = previousHash; // hash del bloque anterior (elementos que facilitan la lista enlazada). Esta referencia, nos indica de donde viene el bloque
    this.hash = hash; // hash del bloque. Null por ahora porque no lo hemos calculado. The calculation of the hash must be at the end so to ensure that all data is assigned correctly before calculation
    //this.height = 0; // altura del bloque en la cadena es el nº de bloque en la cadena
    this.data = data; // información que se almacenará en el bloque
    this.body = this.body = Buffer.from(JSON.stringify(data)).toString("hex"); // contenido de data, convirtiéndolo en una representación hexadecimal de una cadena JSON. Se usa hexadecimal para mantener los datos compactos, trazables y uniformes en la cadena.
    // Tener data y body en el bloque permite usar los datos en formato legible (data) y también en formato hexadecimal (body) para hashing, trazabilidad y eficiencia. Es buena práctica si se usan con propósitos distintos y se mantiene la coherencia entre ambos.
    this.nonce = nonce; // "number only used once". Función: Ayuda a los mineros a resolver el problema criptográfico necesario para agregar el bloque a la cadena. Los mineros deben encontrar un nonce que, cuando se combina con los datos del bloque y se pasa a través de una función hash, produzca un hash que cumpla con ciertos requisitos (normalmente una cierta cantidad de ceros iniciales). Una vez que se encuentra el nonce correcto, el bloque se considera válido y se agrega a la cadena.
    this.difficulty = difficulty || DIFFICULTY; // Dificultad de la prueba de trabajo
    this.processTime = processTime;
    // podemos añadir más propiedades si lo necesitamos
  }


  // Método estático no es necesario instanciar la clase para usarlo
  // Bloque génesis que lo creamos para iniciar la cadena de bloques manuealmente
  // static getGenesisBlock() {
  //   static getGenesisBlock() {
  //     // constantes para las propieda que permacen inmutables en el bloque génesis
  //   const GENESIS_TIMESTAMP = 1738879340000; // inicio procesamiento en tiempo. Math.floor(new Date().getTime() / 1000) * 1000, // timestampDate.now(),
  //   const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
  //   //"Genesis".repeat(10);
  //   const GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"; // BTC HASH GENESIS "8".repeat(64); previus hash
  //   const genesisData = [];
  //   const genesisBody = Buffer.from(JSON.stringify(genesisData)).toString(
  //     "hex"
  //   );
  //   const GENESIS_NONCE = 0; // En el contexto del bloque génesis, el this.nonce no tiene que ser único como en el proceso de minería normal. El bloque génesis es un bloque especial creado manualmente para iniciar la cadena de bloques, y por lo tanto, su nonce se puede fijar a un valor predeterminado (generalmente 0).
  //   const GENESIS_DIFFICULTY = 0;
  //   const GENESIS_PROCESS_TIME = 0;

  //   return new this(
  //     GENESIS_TIMESTAMP, // timestamp fijo para el bloque génesis //Math.floor(new Date().getTime() / 1000) * 1000, // timestamp
  //     GENESIS_PREVIOUS_HASH, // previous hash
  //     GENESIS_HASH, // hash
  //     genesisData, // data
  //     genesisBody,
  //     GENESIS_NONCE, // nonce inicializado a 0 para el bloque génesis
  //     GENESIS_DIFFICULTY, // difficulty
  //     GENESIS_PROCESS_TIME // process time
  //   );
  // }


// Método estático: no requiere instanciar la clase para obtener el bloque génesis
static getGenesisBlock() {
  // 🕒 Timestamp fijo para el bloque génesis (puedes usar Date.now() si quieres generarlo dinámicamente)
  const GENESIS_TIMESTAMP = 1738879340000;

  // 🔗 Hash anterior: en el bloque génesis no hay bloque previo, así que se usa un hash nulo
  const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  // 🧱 Hash del bloque génesis: puede ser fijo o recalculado si cambias el contenido
  const GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

  // 📦 Clave pública FIJA para el bloque génesis (consenso entre nodos)
  const recipientPublicKey = "04b2201e73f77a7fb6a1bbd401cb1ab128bb5128d69ee5f33c5e6657e4609c4ffb17d2abc868e3d3073f2c64d0e14d943e878b9c58d008fc37c441af8db5f45adb";

  // 📦 Datos del bloque génesis: aquí puedes incluir asignaciones iniciales de saldo
  const genesisData = [
    {
      id: "init-fund-1", // identificador único de la transacción
      lote: null, // opcional, útil si agrupas transacciones
      // input: {
      //   timestamp: GENESIS_TIMESTAMP, // marca de tiempo de la transacción
      //   amount: 5000, // no se gasta saldo, es una asignación directa
      //   address: "genesis", // dirección ficticia para indicar que es una emisión inicial
      //   signature: null // no requiere firma, ya que no proviene de una clave privada real
      // },
      inputs: [], // <-- UTXO: array vacío para coinbase/genesis
      outputs: [
        {
          amount: 500, // 💰 saldo inicial asignado
          address: recipientPublicKey // 🔑 clave pública que recibe el saldo (wallet_default.json)
        }
      ]
    }
  ];

  // 🧬 Cuerpo del bloque: se codifica en hexadecimal para mantener consistencia
  const genesisBody = Buffer.from(JSON.stringify(genesisData)).toString("hex");

  // ⚙️ Nonce: no se mina, así que se fija en 0
  const GENESIS_NONCE = 0;

  // 📉 Dificultad: también se fija en 0, ya que no hay prueba de trabajo
  const GENESIS_DIFFICULTY = 0;

  // ⏱️ Tiempo de procesamiento: 0 porque no se calcula
  const GENESIS_PROCESS_TIME = 0;

  // 🧱 Retorna una instancia del bloque con todos los valores definidos
  return new this(
    GENESIS_TIMESTAMP,
    GENESIS_PREVIOUS_HASH,
    GENESIS_HASH,
    genesisData,
    genesisBody,
    GENESIS_NONCE,
    GENESIS_DIFFICULTY,
    GENESIS_PROCESS_TIME
  );
}

  // Método para crear hash toma una entrada y produce una cadena de bytes de tamaño fijo, generalmente una cadena de dígitos hexadecimales. Determinista: siempre misma entrada, misma salida
  static hash(timestamp, previousHash, data, nonce, difficulty) {
    // return crypto
    //   .createHash("sha256")
    //   .update(`${timestamp}${previousHash}${data}${nonce}${difficulty}`)
    //   .digest("hex");
    return ChainUtil.hash(
      `${timestamp}${previousHash}${data}${nonce}${difficulty}`
    ).toString();
  }

  // Método para calcular el hash de un bloque
  /*
     * The hash of the block is created concatenating all the strings from the different properties of the block that were assigned before the block's hash
     * is calculated. The hash can use a number of different cryptographic hash functions to create it, in this case we are using the SHA256 algorithm to
     * achieve the desired string.
     */
  static blockHash(block) {
    const { timestamp, previousHash, data, nonce, difficulty } = block;
    return Block.hash(timestamp, previousHash, data, nonce, difficulty);
  }

// Método para ajustar la dificultad de la prueba de trabajo
// Se obtiene la dificultad del bloque anterior
// Se compara el timestamp del bloque anterior más MINE_RATE (una constante que define el intervalo de tiempo objetivo para la minería de un bloque) con el currentTime:
// Si la suma es mayor que el currentTime, significa que el bloque anterior se minó más rápido de lo esperado, por lo que se aumenta la dificultad.
// Si no, significa que se tardó más de lo esperado, por lo que se disminuye la dificultad.
static adjustDifficulty(previousBlock, currentTime) {
    let { difficulty } = previousBlock; 
    difficulty =
      previousBlock.timestamp + MINE_RATE > currentTime
        ? difficulty + 1
        : difficulty - 1;
    return difficulty=1; //difficulty;
  }

  //Minar un bloque versión sin PoW
  // static mineBlock(previousBlock, data) {
  //   const timestamp = Date.now();
  //   const previousHash = previousBlock.hash;
  //   let { difficulty } = previousBlock;
  //   let nonce = 0;
  //   const hash = this.hash(timestamp, previousHash, data,); // Utilizaremos librería sha256 para calcular el hash
  //   return new this(timestamp, previousHash, hash, data);
  // }

  // el método mineBlock podría estar modificando el nonce del bloque génesis
  //  al pasar como argumento el bloque génesis (previousBlock).
  // En el código de mineBlock, el nonce se incrementa en cada iteración
  
  static mineBlock(previousBlock, data) {
    // Verificación para asegurarse de que el bloque génesis no se mine
    // if (previousBlock.previousHash === "Genesis".repeat(10)) {
    //   throw new Error("No se puede minar el bloque génesis");
    // } lanzar un error no es la solución ideal porque puede interferir con otros tests. Vamos a considerar una solución que mantenga el nonce del bloque génesis sin alteraciones y permita que el método mineBlock funcione correctamente para los bloques normales
    let hash;
    let timestamp;
    const previousHash = previousBlock.hash;
    let { difficulty } = previousBlock;
    let nonce =
      previousBlock.previousHash === "0000000000000000000000000000000000000000000000000000000000000000"
        ? 0
        : previousBlock.nonce;
    let t1 = Date.now();
    let intentos = 0;
    console.log(`[MINERÍA] ⛏️ Iniciando minado de bloque...`);
    // Debug: print previousBlock hashes to trace genesis logic
    console.log(`[DEBUG] previousBlock.hash: ${previousBlock.hash}`);
    console.log(`[DEBUG] previousBlock.previousHash: ${previousBlock.previousHash}`);
    do {
      nonce++;
      intentos++;
      // Use fixed timestamp only for genesis, otherwise use Date.now()
      if (previousBlock.previousHash === "0000000000000000000000000000000000000000000000000000000000000000") {
        timestamp = previousBlock.timestamp;
      } else {
        timestamp = Date.now();
      }
      difficulty = Block.adjustDifficulty(previousBlock, timestamp);
      hash = Block.hash(timestamp, previousHash, data, nonce, difficulty);
      if (intentos % 1000 === 0) {
        console.log(`[MINERÍA] Intento #${intentos} | nonce=${nonce} | dificultad=${difficulty}`);
      }
    } while (hash.substring(0, difficulty) !== "0".repeat(difficulty));
    let t2 = Date.now();
    let processTime = t2 - t1;
    console.log(`[MINERÍA] ✅ Bloque minado tras ${intentos} intentos | nonce final=${nonce} | dificultad final=${difficulty} | tiempo=${processTime}ms`);
    return new this(
      timestamp,
      previousHash,
      hash,
      data,
      nonce,
      difficulty,
      processTime
    );
  }

   // Método que devuelve los datos del bloque
   toString() {
    return `Block:
            timestamp:${this.timestamp}
            Previus Hash: ${this.previousHash}
            Hash:${this.hash}
            Data: ${this.body}
            Nonce: ${this.nonce}
            Difficulty: ${this.difficulty}
            Processtime:${this.processTime}
            `;
  }
  
  // Comparando los hash de los bloques, verificamos si el bloque ha sido manipulado o no (tampering)
  // métedo de validacón NO LO HE USADO
  validate() {
    const self = this;
    // Método asincrono para salvar la posible latencia que devuelve un boleano
    return new Promise((resolve, reject) => {
      try {
        // Guardamos el hash actual
        const currentHash = self.hash;
        // Generamos un nuevo hash
        self.hash = SHA256(JSON.stringify(self)).toString();
        // Comparamos los hash
        if (currentHash !== self.hash) {
          return false;
        }
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// exportamos la clase para usarla en otros archivos
// Exportamos la clase Block usando ES6
export { Block };
