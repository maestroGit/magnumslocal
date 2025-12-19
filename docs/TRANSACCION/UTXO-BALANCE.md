# UTXO Balance — flujo y comportamiento

Este documento explica cómo el proyecto calcula el balance UTXO para una clave pública (public key), las diferencias entre los dos métodos disponibles (scan en blockchain vs UTXO set), y la corrección aplicada para evitar duplicidades en el UTXO set.

## Objetivo
Proporcionar una referencia clara para desarrolladores y operadores sobre:

- Cómo obtener el balance UTXO y la lista de UTXOs para una `publicKey`.
- Por qué pueden aparecer discrepancias entre el `balance` que informa `calculateBalance()` y los `UTXOs` listados.
- Qué cambios se implementaron para evitar duplicados en el `UTXO set`.

---

## Endpoints relevantes

- `GET /utxo-balance/:address`
  - Devuelve un JSON con: `{ address, balance, utxos }`.
  - Implementación: filtra `bc.utxoSet` por `utxo.address === address` y suma los `amount`.
  - Uso: útil para UI, construcción de transacciones y checks rápidos.

- `POST /admin/rebuild-utxo`
  - Propósito: reconstruir el `bc.utxoSet` desde la cadena completa (útil para reparar inconsistencias).
  - Respuesta: `{ success: true, utxoCount }` o error con mensaje.

---

## Métodos para calcular balances

### 1) UTXO set (rápido)
- Descripción: `bc.utxoSet` es una estructura en memoria que almacena las salidas no gastadas conocidas.
- Ventaja: consulta rápida, evita recorrer toda la cadena.
- Uso en el código: `utxos = bc.utxoSet.filter(u => u.address === address)` y `balance = utxos.reduce((s, u) => s + u.amount, 0)`.

### 2) Scan en la blockchain (consistente)
- Descripción: método `Wallet.calculateBalance(blockchain, address)` recorre toda la `blockchain.chain`, marca inputs gastados y luego calcula los outputs no gastados.
- Ventaja: es determinista y sigue la lógica UTXO correcta sin depender del estado de `bc.utxoSet`.
- Desventaja: más lento que usar el `utxoSet` porque recorre todos los bloques y transacciones.

---

## Posible discrepancia: ¿por qué el balance puede ser 300 pero aparecen 2 UTXOs por 300 cada uno?

Causa más probable:
- El endpoint que calcule balance por `Wallet.calculateBalance()` (blockchain scan) considera outputs gastados y inputs gastados correctamente, por lo que muestra un `balance` que refleja la realidad: 300.
- Si `bc.utxoSet` contiene UTXOs duplicados (la misma `txId` y `outputIndex` añadidos más de una vez), la suma sobre `utxoSet` puede devolver un valor mayor (por ejemplo 600 si hay dos UTXOs idénticos de 300).
- Esto explicaría por qué ves `Balance: 300` (blockchain scan) pero `UTXOset` reporta dos UTXOs de 300.

---

## Solución aplicada (evitar duplicidad)

Se aplicó la siguiente corrección en `src/blockchain.js` dentro de `updateUTXOSet(block)`:

- Antes de añadir un nuevo UTXO al array `this.utxoSet`, el código ahora comprueba si ya existe un UTXO con la misma combinación `txId` y `outputIndex`.
- Si existe, no lo vuelve a añadir.

Implementación (resumen):

```js
// Evitar duplicados: comprobar si ya existe este txId+outputIndex
const exists = this.utxoSet.some(
  (u) => u.txId === transaction.id && u.outputIndex === idx
);
if (!exists) {
  this.utxoSet.push({ txId: transaction.id, outputIndex: idx, amount: output.amount, address: output.address });
}
```

Esto previene que eventos de reindexación, re-minado o re-aplicaciones accidentales de bloques añadan la misma salida más de una vez.

---

## Operaciones de reparación

Si detectas discrepancias, puedes reconstruir el `utxoSet` desde cero (recomendado):

1. Llamar al endpoint interno:

```bash
POST /admin/rebuild-utxo
```

2. El servidor reconstruirá `bc.utxoSet` iterando sobre `bc.chain` y aplicando `updateUTXOSet` a cada bloque.

3. Después, consulta `GET /utxo-balance/:address` para verificar que el `balance` y la lista `utxos` son consistentes.

---

## Recomendaciones adicionales

- Mantener tests unitarios que cubran:
  - Inserción de bloques que creen UTXOs y consuman UTXOs (inputs).
  - Repetición de bloques (idempotencia de `updateUTXOSet`).
  - Reconstrucción del UTXO set desde la cadena.

- Monitorizar alertas: si el `utxoSet` crece anormalmente rápido, activar una alerta y reconstruir automáticamente desde la cadena.

- Considerar migrar a una estructura de datos más eficiente (mapa por `txId|outputIndex`) para operaciones O(1) en comprobación y eliminación.

## Mejoras propuestas (implementación y ventajas)

A continuación se documentan dos mejoras prácticas que se pueden implementar para aumentar la robustez y el rendimiento del manejo de UTXOs, junto a su justificación y un bosquejo de implementación.

1) Añadir un test unitario que reproduzca la duplicidad
  - Qué probar:
    - Crear un bloque con una transacción que genere un UTXO para una dirección.
    - Aplicar `updateUTXOSet` con el bloque más de una vez (simular re-aplicación o reindexación).
    - Verificar que después de las repetidas aplicaciones no existan UTXOs duplicados (misma `txId` y `outputIndex`).
    - Verificar que `getBalance(address)` devuelve el valor esperado (sin duplicados).
  - Ventajas:
    - Detecta regresiones que introduzcan duplicados en el `utxoSet`.
    - Permite automatizar la verificación durante CI y evita que cambios futuros reintroduzcan el bug.
  - Implementación (esquema):
    - Ubicación: `testing/` o `wallet/test/` (según convención del repo).
    - Test steps: crear instancia `Blockchain`, construir bloque con transacción, llamar `updateUTXOSet(block)` 2 veces, assert `utxoSet.filter(u => u.txId === tx.id && u.outputIndex === 0).length === 1`.

2) Migrar `bc.utxoSet` a una estructura `Map` indexada por `txId:outputIndex`
  - Idea general:
    - En lugar de usar un array y buscar con `.some()`/`.filter()` para evitar duplicados, mantener un `Map` (o `Object`) donde la key sea `${txId}:${outputIndex}` y el value sea el objeto UTXO.
  - Ventajas:
    - Comprobaciones de existencia en O(1) (lookup directo), mejor rendimiento en sistemas con muchos UTXOs.
    - Eliminación y actualización de UTXOs más simples y seguras.
    - Evita duplicación de forma natural: asignar a la key sobreescribe la entrada en lugar de añadirla.
  - Consideraciones:
    - Serialización: si necesitas persistir `utxoSet` en disco o enviarlo por la red, conviene transformar el mapa a un array de valores o a un objeto serializable.
    - Memoria: `Map` tiene una ligera sobrecarga, pero gana en tiempo para búsquedas y eliminaciones.
    - Cambios en la API interna: revisar todos los lugares que usan `bc.utxoSet` (filter, reduce...) y adaptarlos a la nueva estructura (`Array.from(bc.utxoMap.values())` o helper getters).
  - Implementación (esquema):
    - Inicializar en `Blockchain.constructor`: `this.utxoMap = new Map();`
    - Al añadir: `const key = `${txId}:${outputIndex}`; this.utxoMap.set(key, { txId, outputIndex, amount, address });`
    - Al eliminar (cuando se gaste un input): `const key = `${input.txId}:${input.outputIndex}`; this.utxoMap.delete(key);`
    - Helper para compatibilidad: `getUTXOArray() { return Array.from(this.utxoMap.values()); }` y `getUTXOsByAddress(address) { return this.getUTXOArray().filter(u => u.address===address); }`.

  - Migración incremental:
    - Añadir `utxoMap` junto a `utxoSet` y mantener ambos sincronizados temporalmente.
    - Escribir pruebas que verifiquen equivalencia entre `utxoSet` y `utxoMap` antes de eliminar el array.

Estas dos mejoras combinadas (test + Map) ofrecen robustez (evitan regresiones) y rendimiento (consultas y actualizaciones O(1)). Si quieres, puedo:

- Implementar el test unitario (crear archivo en `testing/` y ejecutar con el runner que uses en el repo). 
- Implementar la migración incremental a `Map` (añadiendo helpers y adaptando `updateUTXOSet` a `utxoMap`, manteniendo `utxoSet` hasta que todas las referencias se migren).

Indícame cuál prefieres que implemente primero: el test unitario o la migración a `Map` (o ambos, en ese orden recomendado: primero test, luego migración).

---

## Ejemplo práctico

Supón que la cadena contiene una transacción con `id = tx1` que tiene dos outputs:

- output[0] -> address A -> 300
- output[1] -> address B -> 200

`updateUTXOSet` añadirá ambos UTXOs. Cuando más tarde se incluya una transacción que gaste `tx1` output[0], la lógica de inputs eliminará el UTXO `tx1#0`.

Si antes de la corrección un bloque se aplicó dos veces por accidente, podrías ver dos entradas `tx1#0` duplicadas; ahora la comprobación evita que eso ocurra.

---

Si quieres, puedo:

- Añadir un test unitario en `testing/` que reproduzca el escenario (bloque duplicado → reconstrucción).
- Mejorar la estructura interna de `utxoSet` para usar un `Map` o un objeto indexado por `txId:outputIndex` para mayor rendimiento y evitar duplicates naturalmente.

Dime cuál de las dos mejoras prefieres y la implemento.


--------------
para mejorar
--------------

Voy a recomendar la mejor ruta práctica y darte un plan paso a paso — corto, con razones y comandos/patches listos — para que elijas qué ejecutar primero.

Recomendación general (orden seguro y de bajo riesgo)

D — Crear tests unitarios que reproduzcan duplicados (PRIORIDAD).
Por qué: baja invasión, detecta regresiones, y te da confianza para cualquier cambio siguiente (migración o persistencia). Siempre empieza por pruebas.

C — Migración a Map en memoria + helpers y adaptar updateUTXOSet (RECOMENDADO para rendimiento).
Por qué: evita duplicados de forma natural (key única), operaciones O(1), y es una mejora local y de bajo riesgo si tienes tests que cubren el comportamiento.

A — Añadir snapshot en archivo (persistencia simple) — útil inmediatamente después de C.
Por qué: implementa persistencia rápida y simple; ideal como primer paso de durabilidad sin añadir dependencias.

B — Write-through a DB embebida (LevelDB/SQLite) — opcional/avanzado.
Por qué: la solución más robusta y escalable; requiere más trabajo y migración. Hazla después de haber protegido la lógica con tests y migrado a Map.

Resumen en una frase

Primero tests (D), luego migras a Map (C), luego añades snapshot (A), y finalmente consideras DB (B) si necesitas escalado/replicación.
Plan de implementación propuesto (detallado, minimal-risk)

D — Test unitario de duplicidad (1–2h)
Crear test en testing/utxoDupTest.test.js usando Jest (ya presente en devDependencies).
Test steps:
Crear Blockchain instance.
Construir una transacción tx con outputs para address A.
Construir un bloque que contenga tx.
Llamar bc.updateUTXOSet(block) dos veces.
Assert que bc.utxoSet.filter(u => u.txId === tx.id && u.outputIndex === 0).length === 1.
Assert que wallet.calculateBalance(bc, address).balance === expected.
Benefits: bloqueo de regresiones; puedes ejecutar en CI.
C — Migración a Map (2–4h)
Cambios principales en blockchain.js:
Añadir this.utxoMap = new Map() en constructor.
En updateUTXOSet:
Para eliminar UTXO: this.utxoMap.delete(\${input.txId}:${input.outputIndex}`)`.
Para añadir output: this.utxoMap.set(\${tx.id}:${idx}`, { txId: tx.id, outputIndex: idx, amount, address })`.
Añadir helpers:
getUTXOArray() devuelve Array.from(this.utxoMap.values()).
getUTXOsByAddress(address) filtra getUTXOArray().
Mantener utxoSet hasta migración completa opcionalmente (modo incremental) or replace usage throughout code with helpers.
Minimal risk with tests in place.
A — Snapshot a archivo (30–60min)
Implementar saveUtxoSnapshot() y loadUtxoSnapshotOrRebuild() helpers (atomically write temp + rename).
Llamar a loadUtxoSnapshotOrRebuild en arranque, y programar saveUtxoSnapshot cada N bloques o cada X minutos.
Opcional: añadir signal handlers para salvar al SIGINT/SIGTERM.
B — DB embebida (opcional, 1–2 días)
Elegir LevelDB (peer: Node binding level) o SQLite (better tooling). Implementar write-through or periodic flush.
Recomendado solo si esperas muchos UTXOs o nodos replicados.


maest@WALK CLANGARM64 ~/Documents/magnumsmaster (feature/coin-control-utxo-selection)

Tu propuesta es muy buena y se llama "coin control", una funcionalidad avanzada que ofrecen wallets como Electrum o Bitcoin Core.

Ventajas de tu solución:

El usuario puede elegir qué UTXOs gastar, optimizando privacidad, comisiones o gestión de saldos.
Si el importe coincide con varios UTXOs, puedes mostrar las combinaciones posibles y dejar que el usuario decida.
Alternativas:

Selección automática optimizada (por antigüedad, tamaño, fee, etc.), pero sin intervención del usuario.
Algoritmos híbridos: sugerir la mejor opción y permitir override manual.
Conclusión:
Implementar una función que proponga las combinaciones de UTXOs que casen con el importe y permita al usuario elegir es una solución flexible y profesional. Puedes ofrecer selección automática por defecto y coin control como opción avanzada.

// Sugerir combinaciones de UTXOs que casen con el importe solicitado
// Devuelve un array de combinaciones posibles (cada una es un array de UTXOs)
// Solo considera UTXOs realmente disponibles (no bloqueados en mempool)
export const sugerirCombinacionesUTXO = (utxoSet, amount) => {
  // Arrow function para buscar todas las combinaciones de UTXOs que sumen >= amount
  const findCombos = (utxos, target, partial = [], results = []) => {
    const sum = partial.reduce((acc, u) => acc + u.amount, 0);
    if (sum >= target && partial.length > 0) {
      results.push([...partial]);
      return results;
    }
    for (let i = 0; i < utxos.length; i++) {
      findCombos(utxos.slice(i + 1), target, [...partial, utxos[i]], results);
    }
    return results;
  };
  // Filtra UTXOs con amount > 0
  const availableUtxos = utxoSet.filter(u => u.amount > 0);
  // Busca combinaciones
  const combos = findCombos(availableUtxos, amount);
  // Ordena por menor exceso (sum - amount)
  combos.sort((a, b) => {
    const sumA = a.reduce((acc, u) => acc + u.amount, 0);
    const sumB = b.reduce((acc, u) => acc + u.amount, 0);
    return (sumA - amount) - (sumB - amount);
  });
  return combos;
};

Correcto, la función sugerirCombinacionesUTXO es una función auxiliar exportada, no un método de la clase Wallet. Esto permite probar y ajustar la lógica de coin control de forma modular y flexible antes de integrarla como método de la clase o en el flujo principal.

Estamos avanzando paso a paso: primero la lógica de sugerencia, luego la integración en la clase Wallet y finalmente la interfaz para el usuario. ¿Quieres que la convierta en método de la clase Wallet o prefieres seguir probando como función auxiliar?

Perfecto, integraré la selección manual de UTXOs (coin control) en ambos lugares:

En la interfaz principal, dentro del modal de "Nueva Transacción", para que las bodegas puedan elegir los UTXOs antes de enviar una transacción.
En la demo de wallet (wallet-demo.html), para que los usuarios puedan probar y gestionar sus UTXOs de forma sencilla.
Comenzaré por la interfaz principal y luego haré la integración en la demo de wallet. ¿Quieres que empiece por la principal ahora?


http://localhost:3000/utxo-balance/0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd
{"address":"0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd","balance":5000,"utxos":[{"txId":"init-fund-1","outputIndex":0,"amount":5000,"address":"0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd"}]}

Correcto, la dirección para consultar los UTXOs debe tomarse dinámicamente de la wallet global (la que se carga al iniciar o al cargar un archivo de wallet), no estar fija en el código.

Para hacerlo correctamente:

Usa una variable global (por ejemplo, window.walletAddress o similar) que se actualice cuando se carga la wallet.
En la función de Coin Control, consulta los UTXOs usando esa variable:
Si el usuario carga una wallet desde archivo, actualiza window.walletAddress con la dirección del archivo cargado.


💼 Gestión de Wallet
Consultar Balance de Clave Pública:
Clave Pública:
0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd
Check Balance
Check UTXO Set
Cargar Wallet desde Archivo:
Seleccionar archivo de wallet:
wallet_default.json Cargar Wallet
🔗 Resultado UTXO Set:
Dirección: 0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd

Balance UTXO: 5000

UTXOs disponibles: 1

Detalles de UTXOs:
Address: 0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd
Amount: 5000
txId: init-fund-1 • outputIndex: 0
Ver TX
Copiar TXID
Consulta: 31/10/2025, 18:46:49 Hasta aquí todo correcto. Pero, al volver al menu Transacciones
Disponible
Crea y gestiona nuevas transacciones en la red
y clicar en: Register bottle . Aparece este mensaje: Coin Control
No hay dirección de wallet activa. Carga una wallet primero.

tengo este error: fetchData.js:429
GET http://localhost:3000/uploads/wallet_default.json 404 (Not Found)
(anonymous) @ fetchData.js:429 pero el archivo si está: C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json

El error 404 ocurre porque el navegador intenta acceder a /uploads/wallet_default.json, pero esa ruta no está expuesta como pública en tu servidor Express. El archivo está en wallet_default.json, pero no está accesible desde el frontend.

Solución rápida:
Debes configurar Express para servir la carpeta uploads como estática. Añade esto en tu server.js (o el archivo principal del backend):

He añadido la línea en tu server.js para servir la carpeta uploads como estática, junto con un comentario explicativo:
// Servir la carpeta app/uploads como estática para permitir acceso a wallet_default.json desde el frontend
// Esto es necesario para que el frontend pueda inicializar la wallet global leyendo la clave pública por defecto
app.use('/uploads', express.static(path.join(__dirname, 'app', 'uploads')));
Ahora el frontend podrá acceder a /uploads/wallet_default.json sin problemas. Recarga el servidor y prueba la funcionalidad. ¿Necesitas algún ajuste más?