# Configuración de PEERS: Relay (Seenode) y Secundario (Railway)

Este documento detalla la configuración de la variable de entorno `PEERS` para sincronizar correctamente la red P2P y la mempool entre el nodo relay principal y el nodo secundario en la nube.

---

## 1. Direcciones PEERS para cada Nodo

### A. Nodo Secundario (Railway)
* **Repositorio:** `magnumslocal`
* **URL Pública HTTP:** `https://magnumslocal-production-9875.up.railway.app/view.html`
* **Configuración en Railway (Pestaña *Variables*):**

```env
PEERS=wss://app.blockswine.com
```
*(También es válido indicar el puerto explícito: `wss://app.blockswine.com:443`)*

---

### B. Nodo Relay Principal (Seenode)
* **Repositorio:** `magnumsmaster`
* **URL Pública HTTP:** `https://app.blockswine.com/`
* **Configuración en Seenode (Variables de Entorno):**

```env
PEERS=wss://magnumslocal-production-9875.up.railway.app
```
*(También es válido indicar el puerto explícito: `wss://magnumslocal-production-9875.up.railway.app:443`)*

---

## 2. Consideraciones Técnicas

### 1. Protocolo Seguro `wss://`
Ambos servicios están desplegados en infraestructuras cloud con terminación TLS/SSL (HTTPS). Los sockets deben conectar usando **`wss://`** (WebSocket Secure) en lugar de `ws://`. Las plataformas cloud enrutan automáticamente el tráfico WebSocket a través del puerto seguro estándar `443`.

### 2. URL Base sin rutas de archivos
En la URL del nodo secundario (`https://magnumslocal-production-9875.up.railway.app/view.html`), `/view.html` es una ruta estática de Express. Dado que `WebSocketServer` se inicializa sobre el servidor HTTP raíz (`new WebSocketServer({ server: httpServer })`), el endpoint WebSocket escucha en la raíz del dominio:
* **Correcto:** `wss://magnumslocal-production-9875.up.railway.app`
* **Incorrecto:** `wss://magnumslocal-production-9875.up.railway.app/view.html`

### 3. Censado Bidireccional
Para garantizar la estabilidad y consistencia de la red, ambos nodos deben tener configurada la dirección del otro:
* **Broadcast de `CLEAR_TRANSACTIONS`:** Cuando el relay mina un bloque, vacía su mempool y emite un mensaje `CLEAR_TRANSACTIONS` a todos sus sockets conectados. Si el relay no tiene la conexión activa hacia el secundario, el secundario no limpiará su mempool y podría intentar volver a minar transacciones ya confirmadas.
* **Propagación en tiempo real:** Las transacciones nuevas se transmiten individualmente vía broadcast a los peers conectados.
* **Auto-reconexión:** Al estar configurados mutuamente en `PEERS`, el método `connectToPeers()` de `app/p2pServer.js` reintenta la conexión automáticamente cada 5 segundos si uno de los dos nodos se reinicia o se redespliega.

---

## 3. Documentación Relacionada
* [CONEXIONES_MEMPOOL_MAGNUMSLOCAL.md](file:///c:/Users/maest/Documents/magnumslocal/docs/MEMPOOL/CONEXIONES_MEMPOOL_MAGNUMSLOCAL.md): Diagnóstico sobre sincronización de mempool y bidireccionalidad.
* [flujomempool.md](file:///c:/Users/maest/Documents/magnumslocal/docs/MEMPOOL/flujomempool.md): Flujo de transacciones y estados de la mempool entre relay y secundario.
