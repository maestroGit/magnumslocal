# Configuración Inicial — Módulos Propios

Este documento resume la función y propósito de los principales módulos propios utilizados en la configuración inicial del backend de magnumsmaster.

---

## blockchainClient
- **Propósito:** Facilita la comunicación con nodos de la red blockchain mediante solicitudes HTTP/JSON-RPC.
- **Funcionalidad:** Permite enviar peticiones RPC a otros nodos, encapsulando la lógica de conexión y manejo de respuestas.
- **Uso:** Se utiliza para interactuar con la red, consultar estados, enviar transacciones, etc.

## miner
- **Propósito:** Gestiona el proceso de minado de bloques en la blockchain.
- **Funcionalidad:** Valida transacciones, crea nuevos bloques, añade recompensas, y sincroniza la cadena con otros nodos vía P2P.
- **Uso:** Permite minar manualmente o automáticamente, añadiendo transacciones válidas y recompensas al bloque.

## p2pServer
- **Propósito:** Implementa el servidor y cliente P2P para la sincronización entre nodos.
- **Funcionalidad:** Utiliza WebSocket para conectar nodos, intercambiar bloques, transacciones y mensajes de control. Gestiona la lista de peers y la comunicación en tiempo real.
- **Uso:** Sincroniza la blockchain y el pool de transacciones entre todos los nodos conectados.

## validator
- **Propósito:** Implementa la lógica de validación de bloques y transacciones bajo el esquema Proof of Stake (PoS).
- **Funcionalidad:** Selecciona validadores según el stake, valida transacciones, crea bloques, sincroniza la cadena y limpia el pool de transacciones.
- **Uso:** Permite validar y añadir bloques de forma segura, distribuyendo la responsabilidad según el stake de cada validador.

---

> Para detalles técnicos, consultar el código fuente de cada módulo en la carpeta `app/`.
