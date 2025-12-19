## Plan: Integrar Algoritmo de Minado Ponderado en magnumsmaster

Integrar el algoritmo de selección ponderada y anti-colusión para determinar qué nodo realiza el minado en la lógica principal del proyecto magnumsmaster, asegurando equidad y resistencia a manipulaciones.

### Steps
1. Identificar el punto de decisión de minado en la lógica actual (`app/miner.js`, `app/blockchainClient.js` o `app/p2pServer.js`).
2. Crear un módulo reutilizable para la selección ponderada de minero (`lib/weightedMinerSelector.js`).
3. Adaptar la estructura de nodos para incluir el historial de bloques minados.
4. Sustituir la lógica de selección de minero actual por el algoritmo ponderado en el flujo de minado.
5. Añadir persistencia y actualización del historial de minados por nodo tras cada bloque.
6. Incluir logs y métricas para auditar la equidad y funcionamiento del sistema.
7. Documentar el algoritmo y su integración en el README y/o documentación técnica.

### Further Considerations
1. ¿La selección debe ser global (todos los nodos) o local (por instancia)?
2. ¿Cómo se sincroniza el historial de minados entre nodos para evitar inconsistencias?
3. ¿Se requiere compatibilidad con la lógica de consenso o validación existente?

## Mayo rdettalle:
## Plan Detallado con desglose : Integración Minado Ponderado en magnumsmaster

Desglose de archivos, clases y puntos de integración para implementar el algoritmo de minado ponderado y anti-colusión.

### Steps
1. **Nuevo módulo de selección ponderada**
   - Crear `lib/weightedMinerSelector.js`
     - Clase o función principal: `WeightedMinerSelector`
     - Métodos: `selectMiner(nodos)`, utilidades para actualizar historial
     - Tests: `test/weightedMinerSelector.test.js`

2. **Adaptar estructura de nodos**
   - Modificar la definición de nodo (ej. en `app/blockchainClient.js` o donde se gestione la lista de nodos)
     - Añadir propiedad: `bloquesMinados` o similar
     - Si existe una clase `Node` o similar, actualizarla

3. **Persistencia del historial**
   - Crear/actualizar almacenamiento del historial de minados:
     - Opción simple: archivo JSON (`data/miningHistory.json`)
     - Opción avanzada: integración con la base de datos o almacenamiento distribuido
   - Métodos para cargar y guardar historial en el arranque y tras cada bloque

4. **Integración en el flujo de minado**
   - En `app/miner.js` (o donde se decide el minero):
     - Reemplazar la selección actual por llamada a `WeightedMinerSelector.selectMiner`
     - Actualizar el historial tras cada minado exitoso

5. **Logs y métricas**
   - Añadir logs en la selección y actualización de historial (`logs/mining.log`)
   - Opcional: endpoint o comando CLI para consultar estadísticas de equidad

6. **Documentación**
   - Documentar la API del nuevo módulo en `docs/`
   - Añadir sección en el README sobre el algoritmo y su integración

### Clases y Funciones a Implementar
- `WeightedMinerSelector`
  - `constructor(historial)`
  - `selectMiner(nodos)`
  - `updateHistory(minerId)`
  - `loadHistory()`
  - `saveHistory()`
- (Si aplica) Clase `Node` o estructura extendida con `bloquesMinados`

### Archivos a crear/modificar
- `lib/weightedMinerSelector.js` (nuevo)
- `test/weightedMinerSelector.test.js` (nuevo)
- `data/miningHistory.json` (nuevo, si se usa persistencia simple)
- `app/miner.js` (modificar)
- `app/blockchainClient.js` o `app/p2pServer.js` (modificar si gestionan nodos)
- `logs/mining.log` (nuevo, opcional)
- `docs/INTEGRACION-MINADO-PONDERADO.md` (nuevo o ampliar)
- `README.md` (ampliar)

### Further Considerations
1. ¿El historial debe ser sincronizado entre nodos? Si es así, definir protocolo de consenso.
2. ¿Cómo se inicializa el historial para nuevos nodos?
3. ¿Qué ocurre si un nodo desaparece o se añade uno nuevo?
4. ¿Cómo se audita la equidad y se detectan intentos de manipulación?


## Integración real (minado bajo demanda)
## Archivos y lógica a modificar para integración real (minado bajo demanda)

Dado que el minado se ejecuta actualmente solo al hacer click y toma la wallet cargada de la bodega (backend), la integración del algoritmo ponderado requiere:

### Archivos a modificar/crear

1. **Backend (Node.js)**
   - `app/miner.js`  
     - Punto principal donde se ejecuta el minado tras el click.
     - Modificar para que, antes de minar, consulte la lista de wallets/nodos disponibles y use el algoritmo ponderado para decidir cuál wallet/nodo debe minar.
   - `lib/weightedMinerSelector.js`  
     - Nuevo módulo con la lógica de selección ponderada.
   - `data/miningHistory.json`  
     - Nuevo archivo para persistir el historial de minados por wallet/nodo.
   - `logs/mining.log`  
     - (Opcional) Log de selecciones y minados para auditoría.
   - `test/weightedMinerSelector.test.js`  
     - Test unitarios del selector ponderado.

2. **Donde se cargan las wallets de la bodega**
   - Si la lista de wallets/nodos se gestiona en otro archivo (ej. `app/blockchainClient.js` o un controlador de bodega), modificar para exponer la lista de wallets/nodos elegibles para minar.

3. **Frontend (si aplica)**
   - Si el frontend muestra la wallet seleccionada para minar, actualizar para reflejar la selección automática (no solo la wallet cargada manualmente).

### Lógica a modificar

1. **Al hacer click en minar:**
   - Obtener la lista de wallets/nodos elegibles (de la bodega/backend).
   - Llamar a `WeightedMinerSelector.selectMiner(listaWallets)` para decidir cuál wallet/nodo debe minar.
   - Usar esa wallet/nodo para ejecutar el minado.
   - Actualizar el historial de minados (`miningHistory.json`) tras cada minado exitoso.

2. **Persistencia y actualización:**
   - Al arrancar el backend, cargar el historial de minados.
   - Tras cada minado, guardar el historial actualizado.

3. **Auditoría y métricas:**
   - Registrar cada selección y minado en un log.
   - (Opcional) Exponer endpoint o comando para consultar estadísticas de equidad.

### Resumen de flujo

- Usuario hace click en "minar".
- Backend obtiene lista de wallets/nodos de la bodega.
- Algoritmo ponderado selecciona la wallet/nodo con menos minados recientes.
- Se ejecuta el minado con esa wallet/nodo.
- Se actualiza el historial y se registra la acción.

---

**Nota:**  
Si actualmente solo se permite minar con la wallet cargada manualmente, deberás modificar el flujo para permitir que el backend decida la wallet/nodo a usar según el algoritmo, y que el frontend muestre la wallet seleccionada automáticamente (o informe al usuario de la selección).