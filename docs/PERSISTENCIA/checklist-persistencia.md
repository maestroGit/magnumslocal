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
