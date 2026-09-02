El flujo completo integra la generación algebraico-determinista de datos (MatrixMath) con la persistencia inmutable basada en registros criptográficos (Hypercore) y el descubrimiento P2P sin servidores mediante la DHT (Hyperswarm).

Flujo Arquitectónico Paso a Paso
[ Máquina A: Emisor / Cliente ]
1. Genera matrices A y B  ---> (MatrixMath)
2. Guarda el lote en Log  ---> (Hypercore local)
3. Anuncia la clave en DHT ---> (Hyperswarm)
                                   │
                           Red P2P Directa (UDP/TCP Hole Punching)
                                   ▼
[ Máquina B: Nodo Minero / Trabajador ]
4. Busca el feed con la Key ---> (Hyperswarm)
5. Réplica dispersa del lote ---> (Hypercore en modo lectura)
6. Reconstruye A, B y calcula C -> (MatrixMath.multiply)
Código Completo e Implementación
0. Módulo matrix-math.js
Guardamos la clase MatrixMath para utilizarla en ambas máquinas:

JavaScript
import crypto from 'crypto';

export class MatrixMath {
  static create(rows, cols, val = 0) {
    return Array.from({ length: rows }, () => Array(cols).fill(val));
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

  static generateDeterministicMatrix(seed, rows, cols) {
    const matrix = MatrixMath.create(rows, cols, 0);
    let counter = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const hash = crypto.createHash('sha256')
          .update(`${seed}:${counter++}`)
          .digest('hex');
        matrix[i][j] = parseInt(hash.substring(0, 8), 16) % 100;
      }
    }
    return matrix;
  }
}
Paso 1, 2 y 3: Emisor de Matrices (producer.js)
Esta máquina crea los datos de matrices con MatrixMath, los empaqueta en el registro de Hypercore y publica el feed en el enjambre P2P de Hyperswarm.

JavaScript
import Hypercore from 'hypercore';
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import { MatrixMath } from './matrix-math.js';

// 1. Inicializar el log inmutable local de Hypercore con codificación JSON
const core = new Hypercore('./producer-data', { valueEncoding: 'json' });
await core.ready();

// 2. Unirse a la red P2P mediante Hyperswarm
const swarm = new Hyperswarm();
swarm.on('connection', (socket) => core.replicate(socket));

// Publicar el tema en la DHT usando la clave de descubrimiento derivada de la clave pública
swarm.join(core.discoveryKey);

console.log('=== NODO EMISOR INICIADO ===');
console.log('Clave pública del Feed (Copia esta clave):');
console.log(b4a.toString(core.key, 'hex'));
console.log('============================\n');

// 3. Generar matrices con MatrixMath y agregarlas al registro P2P
let taskCounter = 0;
setInterval(async () => {
  const n = 4; // Matrices de 4x4
  const matrixA = MatrixMath.generateDeterministicMatrix(`task:${taskCounter}:A`, n, n);
  const matrixB = MatrixMath.generateDeterministicMatrix(`task:${taskCounter}:B`, n, n);

  // Agregar el par de matrices al registro de Hypercore (append-only)
  const blockIndex = await core.append({
    taskId: taskCounter,
    timestamp: Date.now(),
    matrixA,
    matrixB
  });

  console.log(`[Bloque ${blockIndex}] Tarea #${taskCounter} publicada en el feed Hypercore.`);
  taskCounter++;
}, 4000);
Paso 4, 5 y 6: Minero / Consumidor P2P (worker.js)
Esta máquina se conecta mediante Hyperswarm utilizando la publicKey recibida. Descarga únicamente la matriz requerida vía réplica dispersa y realiza el cálculo con MatrixMath.

JavaScript
import Hypercore from 'hypercore';
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import { MatrixMath } from './matrix-math.js';

const FEED_KEY_HEX = process.argv[2];

if (!FEED_KEY_HEX) {
  console.error('Proporciona la clave pública: node worker.js <CLAVE_HEX>');
  process.exit(1);
}

const key = b4a.from(FEED_KEY_HEX, 'hex');

// 1. Abrir un Hypercore en modo réplica en la máquina trabajadora
const core = new Hypercore('./worker-cache', key, { valueEncoding: 'json' });
await core.ready();

// 2. Conectarse al enjambre P2P de Hyperswarm
const swarm = new Hyperswarm();
swarm.on('connection', (socket) => core.replicate(socket));

swarm.join(core.discoveryKey);

console.log('Buscando al emisor en la red P2P...');
await core.update();
console.log(`Conectado. Bloques de tareas disponibles: ${core.length}`);

// 3. Función para consumir una tarea mediante réplica dispersa
async function processTask(index) {
  if (index >= core.length) return;

  // core.get() descarga EXCLUSIVAMENTE las matrices de ese bloque (Sparse Replication)
  const task = await core.get(index);

  console.log(`\n[TRABAJO RECIBIDO] Procesando Bloque #${index} (Tarea ID: ${task.taskId})...`);
  console.log('Matriz A recibida:', task.matrixA[0]); // Muestra primera fila
  console.log('Matriz B recibida:', task.matrixB[0]);

  // 4. Ejecutar la computación útil usando MatrixMath
  const startTime = performance.now();
  const matrixC = MatrixMath.multiply(task.matrixA, task.matrixB);
  const duration = (performance.now() - startTime).toFixed(4);

  console.log(`[CÓMPUTO COMPLETADO en ${duration} ms] Resultado C (Fila 0):`, matrixC[0]);
}

// Procesar la tarea del primer bloque si existe
if (core.length > 0) {
  await processTask(0);
}

// Escuchar nuevos bloques publicados en tiempo real sin descargar el histórico completo
core.on('append', async () => {
  const latestIndex = core.length - 1;
  await processTask(latestIndex);
});
Verificación de la Ejecución
Lanzar la Máquina A (Emisor):

Bash
node producer.js
Salida en consola: Copia la cadena hexadecimal impresa (Clave pública del Feed).

Lanzar la Máquina B (Consumidor/Minero):

Bash
node worker.js <CLAVE_HEXADECIMAL>
Comportamiento en Red:

Hyperswarm localiza al par mediante la DHT global y realiza un hole punch directo.

Hypercore sincroniza la estructura del Merkle Tree.

Sparse Replication: worker.js solicita al enjambre únicamente los bytes asociados al bloque invocado en core.get(index), omitiendo transferencias de datos innecesarias.

MatrixMath reconstruye las matrices desde los objetos desfragmentados y procesa la multiplicación en tiempo local.