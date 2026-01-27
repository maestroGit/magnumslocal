Contexto del proyecto y clases principales
El proyecto magnumslocal implementa una blockchain modular en Node.js/Javascript, con las siguientes clases clave y estructura:

Blockchain (core de la cadena y gestión UTXO, en src/blockchain.js)
Block (estructura completa del bloque, en src/block.js)
Transaction (modelo de inputs/outputs UTXO, en wallet/transactions.js)
TransactionsPool (gestión de mempool, en wallet/transactionsPool.js)
Wallet (firma y selección UTXOs, en wallet/wallet.js)
UTXOManager (mapa UTXO optimizado por address, en src/utxomanager.js)
P2PServer (networking, en app/p2pServer.js)
Miner (lógica de minado, en app/miner.js)
Validator (validación blocks/transacciones, en app/validator.js)
Objetivo
Implementar persistencia híbrida de:

LevelDB para índices (head, estado, utxos, metadatos).
Archivos binarios secuenciales (tipo blkNNNNN.dat) para bloques, encabezados y transacciones completas (binary append only, formato compacto, eficiente).
Requisitos de implementación
Persistir y recuperar bloques completos:

Serializar bloques (Block) a binario compacto (Buffer/from/to Binary), escribir secuencialmente en un archivo .dat.
Leer/deserializar secuencialmente para restaurar el historial de blockchain en arranque.
Usar LevelDB para guardar block_index (clave: hash o n.º → valor: offset/lenght en .dat).
Guardar transacciones y encabezados:

Transacciones (Transaction) se guardan embebidas en bloques, pero opcionalmente también pueden persistirse en archivos separados o como streams auxiliares.
Encabezados (BlockHeader) se pueden guardar por separado para aceleración de consultas.
Almacenar datos auxiliares y metadatos:

LevelDB almacena:
El height de la cadena
UTXO set
Mapas de lookups rápidos (hash → offset, head, etc.)
Formato binario compacto y escritura secuencial:

Cada bloque o transacción se serializa a binario (Buffer).
Se precede de un header de longitud para lectura eficiente.
Compactar campos (números enteros, hashing, strings codificados en largo-fijo o varint).
Proveer funciones tipo: writeBlockToFile(block), readBlockSeq(file, offset).
Requisitos extra:

Documentar la estructura binaria elegida.
Pruebas de corrupción y restauración.
Ejemplo minimal de backup/restauración binaria y consulta por LevelDB.
Datos de ejemplo a persistir
Bloques completos:
{ index, previousHash, timestamp, nonce, difficulty, hash, data: [Transaction, ...] }
Transacción:
{ id, inputs: [..], outputs: [..], firma, timestamp }
Encabezado:
{ index, previousHash, timestamp, difficulty, hash, nonce }
UTXOs:
{ txId, outputIndex, amount, address }
Metadatos:
{ chainHeight, lastBlockHash, utxoSet, ... }
Directrices para el código
Usar Buffer y DataView para manipulación binaria.
Escribir bloques y transacciones con prefijo de longitud (4 bytes, BE).
Indexar bloques por hash/offset en LevelDB.
Proveer funciones para backup completo y restauración atómica.
Añadir tests para comprobar integridad del binario y consistencia con LevelDB.
Checklist de Pasos para Persistencia Híbrida
1. Preparar el entorno
 Asegúrate de tener instalado level (npm install level) y utilizar Node.js >=14.
 Crea un archivo/directorio para la capa de persitencia, por ejemplo storage/ con archivos db.js y blockFile.js.
2. Serialización binaria
 Define una función para convertir cada Block y Transaction a Buffer (binario).
 Define una función para deserializar (de Buffer a objeto JS).
 Opcional: Usa un esquema compacto (usando Buffer concatenado, DataView, varints si lo deseas).
3. Escritura secuencial de bloques
 Implementa función para guardar un bloque al final de un archivo binario (ej: blk00000.dat):
Serializa el bloque a Buffer.
Precede el bloque por 4 bytes con la longitud (Buffer.writeUInt32BE).
Escribe el Buffer al final del archivo (fs.WriteStream({flags: 'a'})).
4. Indexado en LevelDB
 Por cada bloque escrito, guarda en LevelDB:
Clave: block_{hash} o block_{height}
Valor: { offset, length } en el .dat (o Buffer serializado para bloques pequeños).
 Opcional: Indiza transacciones clave→offset para lookup rápido.
5. Lectura/restauración secuencial
 Implementa función para leer todos los bloques secuencialmente (while not EOF):
Lee primeros 4 bytes (length).
Lee length bytes siguientes.
Deserializa a Block y añádelo a la blockchain en memoria.
 Usa LevelDB para saltar a hash u offset específico si lo necesitas.
6. Persistir datos auxiliares
 Guarda los UTXOs, height, encabezados y demás metadatos relevantes como pares KV en LevelDB (db.put('utxoSet', JSON.stringify(...))).
7. Pruebas y documentación
 Escribe pruebas unitarias para:
Serialización/deserialización binaria.
Escritura/lectura secuencial.
Integridad de índices LevelDB.
 Documenta el formato binario usado, y añade scripts o funciones para backup/restauración.
