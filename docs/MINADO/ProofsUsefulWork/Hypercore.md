Hypercore no es como FTP. Aunque ambos sirven para mover datos entre máquinas, funcionan bajo arquitecturas, modelos de confianza y patrones de datos completamente opuestos.

La diferencia clave es que FTP es un protocolo de transferencia de archivos basado en cliente-servidor tradicional, mientras que Hypercore es un registro append-only (de solo anexado) distribuido, P2P y validado por criptografía.

Comparativa Directa
Característica	FTP (File Transfer Protocol)	Hypercore
Arquitectura	Cliente-Servidor (Requiere un servidor central encendido con IP pública o puerto abierto).	Peer-to-Peer (P2P) pura. Cualquier par que tenga los datos ayuda a distribuirlos a los demás.
Estructura de Datos	Archivos estáticos en un sistema de ficheros tradicional (.txt, .mp4, etc.).	Log lineal continuo (Append-only) basado en un árbol de Merkle (Merkle Tree).
Verificación de Datos	Ninguna nativa (confianza ciega en el servidor; si se altera el archivo en el servidor, el cliente lo descarga corrupto).	Verificación criptográfica bloque a bloque. Es imposible alterar un registro del pasado sin romper las firmas criptográficas.
Actualizaciones / Streaming	Estático. Para ver cambios, hay que re-descargar el archivo completo.	Streaming en tiempo real. Los suscriptores reciben bloques nuevos (append) al instante conforme el emisor los escribe.
Lectura Parcial (Sparse Replication)	Descarga el archivo entero (o rangos de bytes si el servidor lo soporta).	Réplica dispersa nativa. Puedes consultar solo el bloque nº 500 de un dataset de 1 TB sin descargar los 999 GB anteriores.
Indexación	Basada en rutas de carpetas (/fotos/2026/01.jpg).	Basada en Claves Públicas / Privadas (Ed25519). Quien tiene la clave pública puede leer y verificar; solo el dueño de la clave privada puede escribir.
¿A qué se parece realmente Hypercore?
Para entender su propósito, es más preciso compararlo con:

Un Kafka P2P criptográfico: Como un bus de eventos (event stream) o log distribuido donde agregas eventos en orden cronológico, pero distribuido sin un clúster central de servidores.

Un Git simplificado y en tiempo real: Tiene historia inmutable basada en bloques/hashes, pero optimizado para sincronizar datos masivos o en live streaming de forma inmediata.

Un bloque de construcción (Building Block): De la misma forma que un disco duro raw guarda bloques y necesitas un sistema de archivos (como EXT4 o NTFS) encima para gestionar carpetas, Hypercore es solo la capa de log inmutable. Sobre él se construyen:

Hyperdrive: Para simular un sistema de archivos completo (más cercano a lo que haría FTP o Dropbox).

Hyperbee: Para construir bases de datos clave-valor ordenadas (B-tree).

Un Ejemplo Práctico
Con FTP: Subes un archivo video.mp4 a un servidor. Si el servidor se apaga, nadie puede descargarlo. Si quieres añadir 5 minutos más de vídeo, tienes que re-subir el archivo entero.

Con Hypercore: Creas un feed y compartes tu clave pública. Transmites vídeo escribiendo bloques continuos. Los pares que lo ven pueden re-compartir esos bloques en tiempo real con otros usuarios cercanos. Si te desconectas temporalmente, los usuarios pueden seguir obteniendo los bloques ya emitidos desde otros pares (peers) que los tengan guardados.

# EJEMPLO hypercore con NODE.JS
Este ejemplo utiliza hypercore para gestionar el registro de matrices y hyperswarm para la interconexión P2P directa entre las dos máquinas sin necesidad de un servidor central.PrerrequisitosInstala las dependencias en ambas máquinas:Bashnpm install hypercore hyperswarm b4a
hypercore: Maneja el log inmutable $append-only$ y la réplica dispersa.hyperswarm: Encargado del hole punching UDP/TCP y el descubrimiento P2P mediante la DHT.b4a: Utilidad para el manejo de buffers binarios en JavaScript de forma agnóstica (Node.js / Browser).1. Máquina Emisora (writer.js)Esta máquina crea el feed de matrices (simuladas aquí como matrices de $100 \times 100$ elementos Float64), las añade al log inmutable y publica la clave pública en la red.JavaScriptimport Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

// 1. Inicializar el feed de Hypercore en disco local
const core = new Hypercore('./climate-data-store', { valueEncoding: 'binary' })
await core.ready()

console.log('--- EMISOR DE MATRICES CLIMÁTICAS ---')
console.log('Clave pública del Feed (Copia esto al lector):')
console.log(b4a.toString(core.key, 'hex'))
console.log('-------------------------------------\n')

// 2. Unirse a la red P2P usando la clave pública como tópico de descubrimiento
const swarm = new Hyperswarm()
swarm.on('connection', (socket) => core.replicate(socket))

const discovery = swarm.join(core.discoveryKey)
await discovery.flushed()

// 3. Función auxiliar para generar una matriz de 100x100 de Float64 (80,000 bytes)
function generateMatrixBuffer(rows, cols, baseVal) {
  const arr = new Float64Array(rows * cols)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = baseVal + (Math.random() * 0.5)
  }
  return b4a.from(arr.buffer)
}

// 4. Simulación: Insertar una matriz cada 2 segundos
let step = 0
setInterval(async () => {
  const matrixBuffer = generateMatrixBuffer(100, 100, 20.0 + step)
  const index = await core.append(matrixBuffer)
  
  console.log(`[Bloque ${index}] Matriz agregada (${matrixBuffer.byteLength} bytes). Total bloques: ${core.length}`)
  step++
}, 2000)
2. Máquina Receptora (reader.js)Esta máquina se conecta al emisor usando la clave pública. Demuestra la réplica dispersa (sparse replication): no descarga todo el histórico; solicita únicamente los bloques específicos que necesita consultar.JavaScriptimport Hypercore from 'hypercore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

// Pegar aquí la clave pública hexadecimal generada por el emisor
const FEED_KEY_HEX = process.argv[2]

if (!FEED_KEY_HEX) {
  console.error('Error: Debes pasar la clave pública como argumento.')
  console.error('Ejemplo: node reader.js <CLAVE_HEX>')
  process.exit(1)
}

const key = b4a.from(FEED_KEY_HEX, 'hex')

// 1. Instanciar Hypercore en modo solo lectura (sin almacenar todo localmente si no se desea)
const core = new Hypercore('./reader-cache', key, { valueEncoding: 'binary' })
await core.ready()

// 2. Unirse al enjambre P2P
const swarm = new Hyperswarm()
swarm.on('connection', (socket) => core.replicate(socket))

swarm.join(core.discoveryKey)

console.log('Buscando pares en la red P2P...')

// Esperar a que el emisor o algún par que tenga los datos se conecte
await core.update() 
console.log(`Conectado. Total de matrices disponibles en el origen: ${core.length}`)

// 3. DEMO DE LECTURA DISPERSA (SPARSE READ)
// En lugar de descargar los bloques 0, 1, 2, 3... pedimos directamente el bloque 0 y el último
async function querySpecificMatrix(index) {
  if (index >= core.length) {
    console.log(`El bloque ${index} aún no ha sido emitido.`)
    return
  }

  // core.get() descarga ÚNICAMENTE este bloque desde la red P2P si no está en caché
  const rawBuffer = await core.get(index)
  
  // Reconstruir la matriz desde el Buffer binario a un TypedArray
  const float64View = new Float64Array(
    rawBuffer.buffer, 
    rawBuffer.byteOffset, 
    rawBuffer.byteLength / Float64Array.BYTES_PER_ELEMENT
  )

  console.log(`\n Matriz indexada en el bloque [${index}] obtenida en tiempo real:`)
  console.log(`- Tamaño del buffer: ${rawBuffer.byteLength} bytes`)
  console.log(`- Primeros 3 valores de la matriz: [${float64View[0].toFixed(2)}, ${float64View[1].toFixed(2)}, ${float64View[2].toFixed(2)}]`)
}

// Consultar únicamente el bloque 0 sin traer el resto de la cadena
await querySpecificMatrix(0)

// Escuchar actualizaciones de nuevos bloques disponibles sin descargarlos automáticamente
core.on('append', async () => {
  const latestIndex = core.length - 1
  console.log(`\n¡Nuevo bloque detectado en la red! Total: ${core.length}`)
  
  // Ejemplo: Decidimos descargar solo los bloques pares
  if (latestIndex % 2 === 0) {
    await querySpecificMatrix(latestIndex)
  } else {
    console.log(`Skipping bloque ${latestIndex} (Réplica dispersa: omitido para ahorrar ancho de banda).`)
  }
})
Cómo ProbarloEn la Máquina A:Bashnode writer.js
Copia la clave hexadecimal que imprime en consola.En la Máquina B (o en otra terminal):Bashnode reader.js <CLAVE_HEXADECIMAL_COPIADA>
Aspectos Clave de la ImplementaciónRendimiento de E/S Cero Copia: Los arrays tipados de JavaScript (Float64Array) se convierten directamente a Buffer subyacente. La serialización binaria evita el coste de procesamiento de formatos como JSON.Sin consumo inútil de disco/red: En la máquina receptora, los bloques no solicitados explícitamente mediante core.get(i) ni se transmiten por la red ni ocupan almacenamiento en ./reader-cache.