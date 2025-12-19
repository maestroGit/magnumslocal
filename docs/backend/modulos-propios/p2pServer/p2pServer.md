# Documentación Detallada: `p2pServer.js`

## Propósito General
`p2pServer.js` implementa el servidor y cliente P2P para la sincronización de la blockchain y el pool de transacciones entre nodos de la red. Utiliza WebSocket para la comunicación en tiempo real, permitiendo la propagación de bloques, transacciones y mensajes de control.

---

## Organización del Módulo
- **Importaciones:**
  - `WebSocket`, `WebSocketServer` de `ws` para la comunicación P2P.
  - `os` para obtener la IP local externa.
- **Constantes:**
  - `MESSAGE_TYPES`: Tipos de mensajes intercambiados (cadena, transacción, limpieza de pool, handshake).
  - `peersEnv`: Lista de peers iniciales desde variables de entorno.
  - `P2P_PORT`: Puerto de escucha para conexiones P2P.
- **Clase Principal:**
  - `P2PServer`: Encapsula toda la lógica de conexión, gestión de peers y sincronización.

---

## Procesos y Flujos Principales

### 1. Inicialización y Conexión
- Al instanciar `P2PServer`, se reciben referencias a la blockchain y el pool de transacciones.
- El método `listen()` inicia el servidor WebSocket en el puerto definido y conecta a los peers configurados.
- Cada conexión entrante se gestiona con `connectSocket(socket)`, añadiendo el peer a la lista interna.

### 2. Gestión de Peers
- Los peers se almacenan con información enriquecida: socket, nodeId, httpUrl, lastSeen.
- El método `connectToPeers()` conecta este nodo a los peers definidos en la configuración.
- Se gestiona la reconexión y la limpieza de peers desconectados.

### 3. Tipos de Mensajes y Sincronización
- **CHAIN:** Propaga la cadena de bloques completa para sincronización.
- **TRANSACTION:** Propaga nuevas transacciones entre nodos.
- **CLEAR_TRANSACTIONS:** Solicita limpiar el pool de transacciones tras minado/validación.
- **HANDSHAKE_HTTP_URL:** Intercambia información de URL HTTP entre nodos para identificación.

### 4. Procesamiento de Mensajes
- Cada mensaje recibido se procesa según su tipo, actualizando la blockchain, el pool de transacciones o la lista de peers.
- Se valida la integridad de la cadena y las transacciones antes de aceptar cambios.

### 5. Sincronización de la Cadena y Pool
- El método `syncChains()` envía la cadena local a todos los peers para mantener la red sincronizada.
- Las transacciones nuevas se propagan automáticamente.
- Tras minar o validar un bloque, se limpia el pool de transacciones en todos los nodos.

---

## Esquema de Flujo P2P
1. **Inicio del nodo:** Se inicia el servidor WebSocket y se conecta a los peers.
2. **Handshake:** Intercambio de información de identificación y URL entre nodos.
3. **Propagación de bloques/transacciones:** Cada nuevo bloque o transacción se envía a todos los peers conectados.
4. **Sincronización:** Se mantiene la cadena y el pool de transacciones sincronizados en toda la red.
5. **Gestión de desconexiones:** Se eliminan peers inactivos y se intenta reconectar si es necesario.

---

## Notas Técnicas y de Mantenimiento
- El módulo está diseñado para ser tolerante a fallos y reconexiones.
- La comunicación es bidireccional y en tiempo real.
- Los tipos de mensajes permiten extender fácilmente la funcionalidad P2P.
- La gestión de peers y la sincronización son automáticas, pero pueden personalizarse según la topología de red.

---

> Para detalles de implementación, consultar el código fuente en `app/p2pServer.js`.
