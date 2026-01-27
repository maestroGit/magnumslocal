En magnumslocal, la blockchain NO se almacena de forma persistente en disco ni en un archivo o base de datos. La cadena de bloques (blockchain.chain) y el UTXO set solo existen en memoria RAM mientras el nodo está en ejecución.

No hay código que use fs, writeFile, readFile ni ningún método para guardar o cargar la blockchain en disco. Cada vez que reinicias el nodo, la blockchain se reinicia desde el bloque génesis y se pierde cualquier dato anterior.

Por lo tanto, cada nodo mantiene su propia copia de la blockchain, pero solo en memoria, no en un archivo o volumen persistente. Si necesitas persistencia, habría que implementar almacenamiento en disco (por ejemplo, guardando la cadena en un archivo JSON o base de datos).

la cadena se guarda en estructuras optimizadas para lectura secuencial, verificación criptográfica y replicación entre nodos.

🧠 Resumen
La persistencia en blockchains privadas se gestiona así:
• 	No JSON
• 	No archivos planos
• 	Sí bases de datos embebidas KV (LevelDB, RocksDB)
• 	Sí estructuras de Merkle para integridad
• 	Sí serialización binaria optimizada
• 	Cada nodo guarda su propia copia
Bitcoin también usa una base de datos embebida tipo key–value, muy similar a LevelDB, para almacenar la cadena y los índices.


🧱 Cómo se guarda realmente la cadena en una blockchain privada
🔹 1. La blockchain necesita:
- Lecturas rápidas de bloques anteriores
- Verificación de hashes
- Escrituras secuenciales
- Recuperación tras fallos
- Integridad garantizada
JSON no sirve para eso.

🔹 2. Se usa almacenamiento en disco estructurado: LevelDB, RocksDB o bases de datos KV
La mayoría de blockchains —públicas y privadas— usan bases de datos clave‑valor embebidas:

🧩 ¿Qué se guarda exactamente?
📦 Bloques
Cada bloque se serializa (generalmente en RLP, protobuf o binario propio) y se guarda como:
clave: hash_del_bloque
valor: bloque_serializado


🌍 Estado mundial
En blockchains tipo Ethereum:
- El estado se guarda en un Merkle Patricia Trie
- Cada nodo del trie es una entrada en LevelDB/RocksDB
- Esto permite verificar integridad sin leer toda la base
📚 Índices
Para acelerar búsquedas:
- Bloques por número
- Transacciones por hash
- Logs por tópico
- Cuentas por dirección

🔹 3. ¿Por qué no usar una base SQL normal?
Porque:
- Las blockchains escriben mucho y secuencialmente
- Las estructuras de Merkle requieren almacenamiento KV
- La verificación criptográfica exige acceso directo por hash
- Las bases SQL son más lentas para este patrón
La excepción es Corda, que no es una blockchain tradicional y usa SQL porque su modelo es distinto (no tiene una cadena global).

🔹 4. ¿Dónde se guarda físicamente?
En cada nodo, en su disco local:
/data/blockchain/chaindata
/data/blockchain/state
/data/blockchain/indexes


Cada nodo tiene su propia copia completa o parcial.

🧱 ¿Qué usa Bitcoin para almacenar la cadena?
🔹 Bitcoin Core usa LevelDB como base de datos principal
Desde la versión 0.8, Bitcoin Core adoptó LevelDB (creado por Google) para almacenar:
- Índices de bloques
- Índices de transacciones
- UTXO set (el estado actual de salidas no gastadas)
Esto permite:
- Lecturas rápidas por clave (hash)
- Escrituras secuenciales eficientes
- Recuperación tras fallos
- Integridad mediante hashes
- Bajo uso de memoria

📦 ¿Qué se guarda en LevelDB?
Bitcoin Core divide el almacenamiento en dos grandes partes:
1. block index (blkindex)
Guarda metadatos de cada bloque:
- Hash del bloque
- Altura
- Timestamp
- Hash del bloque anterior
- Punteros a los archivos .blk
- Estado de validación
Todo esto está en LevelDB como pares clave‑valor.
2. UTXO set (chainstate)
Es la parte más crítica del rendimiento.
- Cada UTXO se guarda como una entrada KV
- La clave es el txid + vout
- El valor contiene el monto, scriptPubKey y altura del bloque
Esto permite verificar transacciones sin leer toda la cadena.

📂 ¿Y los bloques completos?
Los bloques completos no se guardan en LevelDB.
Bitcoin usa archivos binarios secuenciales:
blk00000.dat
blk00001.dat
blk00002.dat
...
🧱 1. Los .dat son archivos contenedores, no archivos por bloque
Bitcoin Core crea archivos llamados:
Cada uno puede contener cientos o miles de bloques, escritos uno detrás de otro en formato binario.
✔ ¿Por qué así?
Porque escribir secuencialmente en un archivo grande es:
- muy rápido
- muy eficiente para el disco
- evita reordenamientos
- reduce fragmentación
- simplifica la recuperación tras fallos

📦 2. ¿Qué se guarda dentro de cada .dat?
Dentro de cada archivo .dat se guardan:
- bloques completos
- transacciones completas
- encabezados
- datos auxiliares
Todo en formato binario compacto.
Bitcoin no necesita reordenar nada porque los bloques se escriben en el orden en que se reciben y validan.

🗂️ 3. ¿Cómo sabe Bitcoin dónde está cada bloque dentro del .dat?
Ahí entra LevelDB.
LevelDB guarda un índice:
clave: hash_del_bloque
valor: { archivo .dat, offset, tamaño }


Así, cuando Bitcoin necesita un bloque:
- Busca el hash en LevelDB
- Obtiene el archivo .dat y la posición exacta
- Lee solo esos bytes del archivo
Esto es extremadamente eficiente.

🔄 4. ¿Cuándo se crea un nuevo .dat?
Cuando el archivo actual llega a un tamaño límite (por defecto ~128 MB), Bitcoin abre uno nuevo:
blk00000.dat  → lleno
blk00001.dat  → lleno
blk00002.dat  → escribiendo...
- No hay un .dat por bloque
- Cada .dat contiene muchos bloques
- Los bloques se escriben secuencialmente
- LevelDB guarda los índices para encontrarlos
- Es un diseño híbrido: archivos binarios + base KV

Estos archivos contienen:
- Bloques completos
- Transacciones completas
- Datos en formato binario compacto
LevelDB solo guarda los índices que apuntan a estos archivos.
🧱 Cómo se almacena un bloque dentro de un .dat en Bitcoin
Cada bloque dentro de un archivo blkXXXXX.dat sigue esta estructura secuencial:
🔹 1. Magic bytes (4 bytes)
Identifican el inicio de un bloque.
En mainnet:
F9 BE B4 D9

En testnet:
0B 11 09 07

Sirven para que Bitcoin Core pueda escanear el archivo y detectar dónde empieza un bloque.
🔹 2. Block length (4 bytes, little endian)
Indica cuántos bytes ocupa el bloque completo (header + transacciones).
Ejemplo:
20 03 00 00


Significa que el bloque ocupa 0x00000320 = 800 bytes.

🔹 3. Block header (80 bytes)
Siempre tiene esta estructura fija:
|  |  |  | 
|  |  |  | 
|  |  |  | 
|  |  |  | 
|  |  |  | 
|  |  |  | 
|  |  |  | 



🔹 4. Transactions (variable)
Después del header viene:
- VarInt → número de transacciones
- Cada transacción serializada en formato binario:
[version]
[inputs]
[outputs]
[locktime]



🧩 Ejemplo real (simplificado)
Un bloque dentro del .dat podría verse así:
F9 BE B4 D9                      # magic bytes
A3 04 00 00                      # tamaño del bloque (1187 bytes)
02000000                         # version
<32 bytes prev hash>
<32 bytes merkle root>
<4 bytes timestamp>
<4 bytes bits>
<4 bytes nonce>
0A                               # número de transacciones (VarInt = 10)
<tx1>
<tx2>
...
<tx10>


Todo esto se escribe uno detrás de otro dentro del archivo .dat.

🧠 ¿Por qué este formato es tan eficiente?
- Escritura secuencial → extremadamente rápida
- Lectura por offset → LevelDB te dice dónde está cada bloque
- No requiere reordenar nada
- Fácil de recuperar incluso si el archivo se corrompe parcialmente
- Perfecto para discos mecánicos y SSD
Bitcoin fue diseñado para ser robusto incluso en hardware muy limitado.

🧭 Si quieres, puedo mostrarte:
- Cómo se ve un bloque real en hexadecimal
- Cómo Bitcoin Core indexa estos bloques en LevelDB
- Cómo se parsea un .dat con un script propio
- Cómo implementar un lector de bloques en Python o Go
Tú decides hacia dónde seguimos.
🔹 3. Block header (80 bytes)
Siempre tiene esta estructura fija:



🔹 4. Transactions (variable)
Después del header viene:
- VarInt → número de transacciones
- Cada transacción serializada en formato binario:
[version]
[inputs]
[outputs]
[locktime]



🧩 Ejemplo real (simplificado)
Un bloque dentro del .dat podría verse así:
F9 BE B4 D9                      # magic bytes
A3 04 00 00                      # tamaño del bloque (1187 bytes)
02000000                         # version
<32 bytes prev hash>
<32 bytes merkle root>
<4 bytes timestamp>
<4 bytes bits>
<4 bytes nonce>
0A                               # número de transacciones (VarInt = 10)
<tx1>
<tx2>
...
<tx10>


Todo esto se escribe uno detrás de otro dentro del archivo .dat.

🧠 ¿Por qué este formato es tan eficiente?
- Escritura secuencial → extremadamente rápida
- Lectura por offset → LevelDB te dice dónde está cada bloque
- No requiere reordenar nada
- Fácil de recuperar incluso si el archivo se corrompe parcialmente
- Perfecto para discos mecánicos y SSD
Bitcoin fue diseñado para ser robusto incluso en hardware muy limitado.

🧭 Si quieres, puedo mostrarte:
- Cómo se ve un bloque real en hexadecimal
- Cómo Bitcoin Core indexa estos bloques en LevelDB
- Cómo se parsea un .dat con un script propio
- Cómo implementar un lector de bloques en Node
🧱 1. Cómo se parsea un .dat de Bitcoin con un script propio
Un archivo blkXXXXX.dat contiene:
[magic bytes][block length][block data]
[magic bytes][block length][block data]
...


Por tanto, el algoritmo general es:
- Abrir el archivo en modo binario
- Leer 4 bytes → magic bytes
- Verificar si coinciden con F9 BE B4 D9 (mainnet)
- Leer 4 bytes → tamaño del bloque
- Leer N bytes → bloque completo
- Procesar el bloque (header + transacciones)
- Repetir hasta EOF

🧩 2. Ejemplo de parser minimalista (pseudocódigo)
open file
while not EOF:
    magic = read(4)
    if magic != MAGIC_MAINNET:
        buscar siguiente magic (resync)
    block_length = read_uint32_le()
    block_data = read(block_length)
    parse_block(block_data)



🟦 3. Implementación real en Node.js
Aquí tienes un lector funcional en Node que:
- Abre un .dat
- Busca magic bytes
- Extrae bloques
- Decodifica el header
- Muestra información útil
📌 Dependencias necesarias
Usaremos solo módulos nativos:
- fs
- Buffer
No dependemos de librerías externas.

🧱 Código: lector de bloques Bitcoin en Node.js
const fs = require('fs');

const MAGIC = Buffer.from([0xF9, 0xBE, 0xB4, 0xD9]); // mainnet

function readUInt32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function parseBlockHeader(buffer) {
  return {
    version: buffer.readInt32LE(0),
    prevHash: buffer.slice(4, 36).reverse().toString('hex'),
    merkleRoot: buffer.slice(36, 68).reverse().toString('hex'),
    timestamp: buffer.readUInt32LE(68),
    bits: buffer.readUInt32LE(72),
    nonce: buffer.readUInt32LE(76)
  };
}

function parseDatFile(path) {
  const data = fs.readFileSync(path);
  let offset = 0;

  while (offset < data.length) {
    // Buscar magic bytes
    if (!data.slice(offset, offset + 4).equals(MAGIC)) {
      offset++;
      continue;
    }

    offset += 4;

    // Leer tamaño del bloque
    const blockSize = readUInt32LE(data, offset);
    offset += 4;

    // Extraer bloque completo
    const block = data.slice(offset, offset + blockSize);
    offset += blockSize;

    // Header = primeros 80 bytes
    const header = parseBlockHeader(block.slice(0, 80));

    console.log("=== Bloque encontrado ===");
    console.log("Prev:", header.prevHash);
    console.log("Merkle:", header.merkleRoot);
    console.log("Timestamp:", new Date(header.timestamp * 1000));
    console.log("Nonce:", header.nonce);
    console.log("-------------------------");
  }
}

parseDatFile("blk00000.dat");



🧠 Qué hace este script
- Recorre el archivo byte a byte
- Detecta el inicio de cada bloque
- Lee el tamaño
- Extrae el bloque completo
- Decodifica el header
- Imprime información útil
Esto es exactamente lo que hace Bitcoin Core, pero a nivel muy simplificado.

🧩 4. ¿Quieres ir más lejos?
Puedo ayudarte a implementar:
✔ Decodificación completa de transacciones
Incluyendo:
- VarInts
- Inputs
- Outputs
- Scripts (ASM)
- Witness (SegWit)
✔ Un lector de toda la blockchain
Que recorra todos los .dat y reconstruya la cadena.
✔ Un indexador propio
Similar al de Bitcoin Core, usando LevelDB o RocksDB.
✔ Un explorador de bloques minimalista
Con Node + Express + SQLite o LevelDB.

🧠 ¿Por qué este diseño híbrido?
Porque Bitcoin necesita:
✔ Escrituras secuenciales rápidas
Los .dat permiten escribir bloques sin reordenar nada.
✔ Búsquedas rápidas por hash
LevelDB permite buscar un bloque o UTXO en milisegundos.
✔ Robustez ante fallos
LevelDB tiene journaling y recuperación.
✔ Integridad
Los hashes de los bloques y UTXOs garantizan consistencia.

🧩 Comparación con otras blockchains
|  |  |  | 
|  | .dat |  | 
|  |  |  | 
|  |  |  | 
|  |  |  | 


Bitcoin es el único que combina archivos secuenciales + LevelDB.

🧠 Resumen claro
Sí, Bitcoin usa LevelDB.
Pero no para guardar los bloques completos, sino:
- Índices
- UTXOs
- Metadatos
Los bloques completos se guardan en archivos binarios .dat.

Si quieres, puedo explicarte cómo se estructura un bloque dentro de los .dat, o cómo funciona el UTXO set internamente.

LevelDB es una base de datos embebida de código abierto (open source), desarrollada originalmente por Google. En cuanto a coste monetario, LevelDB es completamente gratuita:

Está licenciada bajo la licencia BSD, lo que te permite usarla libremente para uso personal, comercial, o académico sin pagar ningún tipo de tarifa por licencias o royalties.
Consideraciones adicionales:

Sin infraestructura propia: LevelDB no es un servicio alojado en la nube, ni una base de datos cliente-servidor, sino una librería que debes integrar en tu propia aplicación. No tiene un servidor propio, simplemente almacena los datos en archivos locales del disco donde corre tu aplicación.
Costes de almacenamiento y operación: El único “coste” real sería el del almacenamiento físico del dispositivo donde se ejecuta tu aplicación y recursos necesarios (RAM/CPU), pero no hay ningún coste asociado al uso de la librería.
Sin soporte técnico comercial: Si quieres soporte empresarial, necesitarías buscar consultores externos, pero el software en sí no tiene coste.