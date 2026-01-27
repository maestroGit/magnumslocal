# Persistencia binaria de la blockchain en magnumslocal

## Resumen
Esta implementación permite que la blockchain se almacene y restaure automáticamente desde un archivo binario secuencial (`blk00000.dat`), asegurando que los bloques y el estado de la cadena sobrevivan a reinicios del nodo.

## Componentes principales
- **storage/blockFile.js**: Funciones para serializar, escribir y leer bloques en formato binario compacto.
- **src/blockchain.js**: Integración de la lógica de persistencia en la clase `Blockchain`.
- **test/testBlockFile.js**: Script de prueba para verificar la persistencia y restauración.

## Detalle de la implementación

### 1. Serialización y escritura binaria
- Cada bloque se serializa a un `Buffer` (actualmente usando `JSON.stringify`, fácilmente extensible a binario puro).
- Antes de cada bloque, se escriben 4 bytes (UInt32BE) indicando la longitud del bloque.
- Los bloques se añaden al final del archivo (`append only`).

### 2. Lectura secuencial
- Al inicializar la blockchain, se lee el archivo binario secuencialmente:
  - Se leen 4 bytes (longitud), luego el bloque.
  - Cada bloque se deserializa y se añade a la cadena en memoria.
- Si el archivo no existe, se crea el bloque génesis y se guarda.

### 3. Integración en Blockchain
- El constructor de `Blockchain` acepta la ruta del archivo binario.
- El método `initialize()` carga la cadena desde disco o crea el génesis.
- `addBlock(data)` mina, añade y persiste un nuevo bloque.
- `replaceChain(newChain)` reemplaza la cadena y sobrescribe el archivo binario.

### 4. Robustez
- La función `updateUTXOSet` es tolerante a bloques sin transacciones o con datos corruptos.
- El sistema es seguro ante reinicios: siempre restaura el historial completo.

## Cambio de ubicación de archivos binarios

A partir de enero 2026, los archivos binarios de bloques (`.dat`) se almacenan en el directorio:

    storage/data/

Por ejemplo: `storage/data/blk00000.dat`

Esto permite separar claramente la lógica de persistencia (código JS en `storage/`) de los datos binarios reales (en `storage/data/`).

El test y la lógica de la blockchain han sido actualizados para usar esta nueva ubicación por defecto. Si necesitas cambiar la ruta, puedes pasarla como parámetro al crear la instancia de `Blockchain`.

## Rotación automática de archivos .dat

Desde enero 2026, la persistencia binaria implementa rotación automática de archivos:
- Cuando un archivo .dat supera los **128MB**, se crea uno nuevo en el mismo directorio (`blk00001.dat`, `blk00002.dat`, ...).
- La lógica de escritura detecta el tamaño y realiza la rotación sin intervención manual.
- Todos los archivos .dat se agrupan en `storage/data/`.

Esto permite mantener la eficiencia, facilitar backups y evitar archivos demasiado grandes.

**Ejemplo de archivos generados:**
```
storage/data/blk00000.dat
storage/data/blk00001.dat
storage/data/blk00002.dat
```

La rotación es transparente para el usuario y la blockchain sigue funcionando sin interrupciones.

## Ejemplo de uso
```js
import { Blockchain } from '../src/blockchain.js';
const blockchain = new Blockchain();
await blockchain.initialize();
await blockchain.addBlock([{ from: 'A', to: 'B', amount: 42 }]);
```

## Prueba
Ejecuta:
```bash
node ./test/testBlockFile.js
```
Verás cómo se añade un bloque, se guarda, y al reiniciar se restaura toda la cadena desde disco.

## Extensiones futuras
- Serialización binaria compacta (usando DataView, varint, etc).
- Persistencia de índices y metadatos en LevelDB.
- Backup/restauración atómica y pruebas de integridad.

## Estructura interna de un bloque en el archivo .dat

Cada bloque se almacena en el archivo binario secuencial con la siguiente estructura:

1. **Prefijo de longitud**: 4 bytes (UInt32BE, big-endian) que indican el tamaño del bloque en bytes.
2. **Bloque serializado**: El bloque serializado como JSON (actualmente), convertido a Buffer UTF-8.

### Campos del bloque serializado
- `timestamp`: Marca de tiempo de creación del bloque.
- `previousHash`: Hash del bloque anterior.
- `hash`: Hash propio del bloque.
- `data`: Array de transacciones u objetos.
- `body`: Versión hexadecimal de `data` (opcional, para trazabilidad).
- `nonce`: Número de prueba de trabajo.
- `difficulty`: Dificultad de minado.
- `processTime`: Tiempo de minado.

**Ejemplo binario:**
```
[4 bytes longitud][{ "timestamp":..., "previousHash":..., "hash":..., "data": [...], ... }]
```

Actualmente se usa JSON+Buffer para facilitar depuración y portabilidad, pero la estructura es fácilmente extensible a un formato binario compacto en el futuro.

Estimación de bloques por .dat de 128 MiB
Tamaños de bloque:
Bloque génesis: 300–600 bytes
Bloque “normal” (1–5 transacciones): 500–2,000 bytes
Cálculos aproximados:
Caso “peor” (bloques grandes, 2,000 bytes cada uno):
128 MiB = 134,217,728 bytes
Bloques por .dat = 134,217,728 / 2,000 ≈ 67,108 bloques por archivo .dat
Caso “normal” (bloques de 800 bytes promedio):
Bloques por .dat = 134,217,728 / 800 ≈ 167,772 bloques por archivo .dat
Caso “mínimo” (solo bloques génesis, 400 bytes):
Bloques por .dat = 134,217,728 / 400 ≈ 335,544 bloques por archivo .dat
Ejemplo visual para tu red:
Supón que generas 1 bloque por minuto:
En el caso máximo (2,000 bytes):
67,108 bloques ≈ 46 días guardados en un solo archivo .dat
En el caso normal (800 bytes):
167,772 bloques ≈ 116 días en un solo archivo .dat
Si tu actividad es incluso menor, podrías tener años en un solo .dat.
Conclusión y buenas prácticas
Un tamaño de 128 MiB por archivo .dat te asegura muchísima capacidad para tu uso actual.
Mantener el estándar te simplifica backups, compatibilidad y futuras mejoras.
Puedes ajustar el tamaño si quieres una rotación más frecuente, pero el estándar es suficientemente flexible para tu caso de uso.

Para saber el tamaño exacto de un bloque, puedes usar:

const buf = blockToBuffer(block);
console.log('Tamaño del bloque:', buf.length, 'bytes');