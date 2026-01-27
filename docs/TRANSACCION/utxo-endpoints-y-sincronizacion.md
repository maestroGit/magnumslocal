# Endpoints de UTXO y Sincronización en Magnumslocal

## Endpoints principales

### 1. `/utxo-balance/global`
- **Método:** GET
- **Descripción:** Devuelve el balance y los UTXOs de la wallet global actualmente cargada en el backend.
- **Funcionamiento:**
  - Obtiene la clave pública de la wallet global.
  - Filtra el set de UTXOs global (`bc.utxoSet`) para esa dirección.
  - Devuelve el balance total y el listado de UTXOs.

### 2. `/utxo-balance/:address`
- **Método:** GET
- **Descripción:** Devuelve el balance y los UTXOs disponibles para una dirección específica usando el `UTXOManager`.
- **Funcionamiento:**
  - Utiliza `utxoManager.getUTXOs(address)` para obtener los UTXOs de la dirección.
  - Compara los resultados con el set global (`bc.utxoSet`) para detectar posibles desincronizaciones.
  - Devuelve el balance, los UTXOs disponibles y los pendientes (por inputs en la mempool).

## Problema de sincronización

Durante el desarrollo, se detectó que el endpoint `/utxo-balance/:address` (basado en `UTXOManager`) no devolvía los UTXOs esperados tras una sustitución de la cadena (por ejemplo, después de un replaceChain en la blockchain). Sin embargo, `/utxo-balance/global` (basado en `bc.utxoSet`) sí mostraba los UTXOs correctos.

**Causa:**
- El `UTXOManager` no se sincronizaba correctamente tras reemplazar la cadena, porque la función de sincronización se llamaba antes de que la nueva cadena estuviera completamente cargada en memoria.

## Solución implementada

- Se añadió un hook al método `replaceChain` de la blockchain para llamar a `syncUTXOManagerWithBlockchain()` después de reemplazar la cadena.
- Se introdujo un pequeño retardo (`setTimeout`) para asegurar que la cadena (`bc.chain`) estuviera completamente actualizada antes de sincronizar el `UTXOManager`.
- Ahora, tras cada reemplazo de cadena, el `UTXOManager` reconstruye su estado a partir de la cadena actual, garantizando que los endpoints devuelvan los UTXOs correctos.

## Comportamiento y métodos de UTXOManager

### ¿Qué es UTXOManager?
- Es un gestor eficiente de UTXOs por dirección, que permite consultar rápidamente los UTXOs disponibles para cualquier dirección sin recorrer toda la blockchain.

### Métodos principales
- `getUTXOs(address)`: Devuelve los UTXOs disponibles para una dirección específica.
- `updateWithBlock(block)`: Actualiza el set de UTXOs internos procesando las transacciones de un bloque.
- `syncUTXOManagerWithBlockchain()`: Reconstruye el estado del UTXOManager desde cero, procesando todos los bloques de la cadena.

### Comportamiento tras la solución
- El `UTXOManager` se sincroniza automáticamente:
  - Al arrancar el backend.
  - Tras minar un nuevo bloque.
  - Tras reemplazar la cadena (con retardo para asegurar consistencia).
- Los endpoints `/utxo-balance/global` y `/utxo-balance/:address` muestran ahora los UTXOs correctos y consistentes.

---

**Resumen:**
Gracias a la sincronización automática y robusta del `UTXOManager` tras cada cambio relevante en la blockchain, los endpoints de consulta de UTXOs funcionan correctamente y reflejan el estado real de la cadena, resolviendo los problemas previos de desincronización.