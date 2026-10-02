# Casuística y Protocolo de Reinicio de Cadena en Red P2P Distribuida

**Fecha de documento:** 2 de octubre de 2026 (2026-10-02)  
**Proyecto:** BlocksWine (`magnumsmaster` / `magnumslocal`)  
**Ubicación:** `docs/PERSISTENCIA/reinicio-red-consenso-p2p.md`

---

## 1. Resumen Ejecutivo

Durante el desarrollo y despliegue de la red blockchain (Seenode como Relay central y Railway / nodos locales como secundarios), puede requerirse **reiniciar la cadena desde cero a bloque génesis (`chain.length === 1`)**.

Sin embargo, al intentar hacerlo simplemente eliminando el archivo local `storage/data/blk00000.dat` y haciendo `git push`, los nodos desplegados continúan reportando la cadena vieja con múltiples bloques (por ejemplo, longitud 4), o bien un nodo reiniciado vuelve a adoptar de inmediato la cadena vieja al conectarse a la red.

Este documento detalla la **causa técnica del problema (bucle de consenso P2P de la cadena más larga y persistencia PaaS)** y el **protocolo operativo probado y validado** para reiniciar la red de forma limpia y sincronizada.

---

## 2. Anatomía del Problema

### 2.1. Trazas del Registro (Logs)

Al reiniciar un nodo secundario a génesis e intentar sincronizarlo con el Relay veterano:

```text
[12:21:38 PM] [P2P][CHAIN][RECEIVED] ⛓️  Recibida nueva cadena desde peer. Longitud: 1
[12:21:38 PM] [P2P][CHAIN][RECEIVED] replaceChain llamado. Longitud anterior: 4, hash último bloque local: 099a60...
[12:21:38 PM] [REPLACECHAIN][INFO] Received chain is not longer than the current chain.
[12:21:38 PM] [P2P][CHAIN][RESULT] replaceChain ejecutado. Longitud nueva: 4
[12:21:38 PM] [P2P][CHAIN][REJECTED] La cadena recibida fue rechazada o no se pudo persistir en disco.
...
[12:22:11 PM] [P2P][DEBUG] Enviando cadena a peer (socket readyState=1)...
[12:22:11 PM] [P2P][DEBUG] Cadena enviada correctamente al peer.
```

### 2.2. Las Tres Causas Raíz

```
           [Desarrollador borra .dat local]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │ Razón 1: .gitignore               │
        │ storage/data/blk*.dat no va a Git │  ──> Git push NO borra nada en remoto
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │ Razón 2: Disco Persistente PaaS   │
        │ Seenode/Railway conservan disco   │  ──> /usr/src/app/storage/data/blk00000.dat
        └─────────────────┬─────────────────┘      sigue vivo con N bloques
                          │
                          ▼
        ┌───────────────────────────────────┐
        │ Razón 3: Consenso P2P (N > 1)     │
        │ "Longest Chain Rule"              │  ──> El nodo veterano contagia su cadena
        └───────────────────────────────────┘      a cualquier nodo nuevo que entre
```

1. **El archivo binario no viaja en el control de versiones (`.gitignore`):**
   - En `.gitignore` figura:
     ```gitignore
     storage/data/blk*.dat
     ```
   - Por tanto, eliminar el `.dat` en la máquina de desarrollo no genera ningún cambio en el repositorio Git. Un `git push` a `origin/main` despliega el nuevo código, pero jamás borra los archivos existentes en el sistema de archivos del servidor remoto.

2. **Persistencia del sistema de archivos en plataformas Cloud (Seenode / Railway):**
   - En entornos PaaS y contenedores Kubernetes (`/usr/src/app`), los volúmenes o discos asignados persisten los datos generados en runtime.
   - El archivo binario `/usr/src/app/storage/data/blk00000.dat` se mantiene entre re-despliegues normales. Al iniciar `server.js`, la función `Blockchain.initialize()` encuentra el archivo y lo lee automáticamente:
     ```text
     [Blockchain] Loaded 4 blocks from file
     ```

3. **Bucle de Consenso P2P de la cadena más larga (`replaceChain`):**
   - En `src/blockchain.js`:
     ```javascript
     if (newChain.length <= this.chain.length) {
       console.log("[REPLACECHAIN][INFO] Received chain is not longer than the current chain.");
       return false;
     }
     ```
   - Si **incluso un solo nodo** en la red permanece activo con una cadena veterana de longitud $N > 1$:
     - **Rechazo asimétrico:** Si un nodo recién creado con longitud 1 (génesis) se conecta al nodo veterano y le envía su cadena, el veterano la rechaza porque $1 \le N$.
     - **Contagio por propagación:** En la misma conexión, el veterano le reenvía su cadena de longitud $N$ al nodo nuevo. Como $N > 1$, el nodo nuevo ejecuta `replaceChain`, sobrescribe su disco y vuelve a quedar atrapado en la cadena de 4 bloques.

---

## 3. Protocolo Operativo Validado (Solución por Maniobra de Secuencia)

Para romper definitivamente el bucle de contagio P2P, los nodos no deben reiniciarse de forma simultánea sin desconexión, sino siguiendo una **secuencia coordinada de aislamiento**:

```
 [Seenode (Relay)]                             [Railway (Secundario)]
        │                                                │
   1. PAUSAR / DORMIR                                    │
   (Desconecta sockets P2P)                              │
        │                                                │
        │                                         2. DESPLEGAR LIMPIO
        │                                         (Arranca en Génesis: L=1)
        │                                         (Sin peers activos donde contagiarse)
        │                                                │
        │                                                ▼
        │                                         Queda a la espera (L=1)
        │                                                │
   3. REACTIVAR / DESPLEGAR LIMPIO                       │
   (Arranca en Génesis: L=1)                             │
        │                                                │
        └──────────────── 4. CONEXIÓN P2P ───────────────┘
                     Ambos nodos: Longitud = 1
                     Mismo Genesis Hash: 000000000019d668...
                     Sin sustitución ni rechazos
                     ¡Red limpia sincronizada!
```

### Paso a Paso Operativo:

1. **Pausar o detener temporalmente el Relay (Seenode):**
   - Poner en modo *sleep* o *stop* el servicio en Seenode.
   - Esto apaga el WebSocket Server (`wss://app.blockswine.com`) y desmantela la red P2P activa, evitando que sirva de semilla de la cadena veterana.

2. **Desplegar y limpiar el Nodo Secundario (Railway):**
   - Desplegar el servicio secundario asegurando el borrado de su archivo `.dat` (o recreando el servicio).
   - Como el Relay central está dormido, el nodo secundario no tiene peers a los que consultar.
   - Arranca de forma autónoma en el bloque génesis (`chain.length === 1`) y queda escuchando pacíficamente.

3. **Reactivar y limpiar el Relay (Seenode):**
   - Eliminar el `.dat` en el almacenamiento de Seenode (o recrear contenedor/volumen).
   - Reactivar el despliegue del repositorio `magnumsmaster`.
   - El Relay inicializa su cadena en longitud 1 con el bloque génesis por defecto.

4. **Reconexión y Convergencia de Consenso:**
   - El secundario o el relay restablecen la conexión WebSocket (`wss`).
   - El secundario anuncia su cadena (`Longitud: 1`).
   - El Relay recibe la cadena (`Longitud: 1`). Al ser ambas de longitud 1 y compartir el mismo bloque génesis determinista (`Block.getGenesisBlock()`), ninguna cadena invalida a la otra ni hay rechazos.
   - La red queda 100% limpia y sincronizada desde el génesis.

---

## 4. Comportamiento en la Base de Datos Relacional

Gracias a la integración con `chainIndexerService.syncDatabaseWithBlockchain`:

```
               bc.initialize() [chain.length === 1]
                                │
                                ▼
                   [chainIndexerService]
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
¿Hay eventos activos previos?                No hay eventos previos
        │                                               │
   [SÍ: Cadena reseteada]                       [Inicio desde cero]
        │                                               │
        ▼                                               ▼
Actualiza registros históricos:             Mantiene estado limpio
  BurnEvent: is_active = false
  Notification: is_active = false
        │
        ▼
Dashboard arranca en 0 notificaciones
Trazabilidad de auditoría histórica conservada
```

1. Cuando ambos nodos inician con `chain.length === 1`, el servicio detecta automáticamente el reinicio de la cadena.
2. Los eventos de quema y notificaciones que pertenecían a los 4 bloques anteriores son marcados como `is_active = false`.
3. El frontend de la aplicación arranca con balance y notificaciones limpias, sin generar errores de integridad ni inconsistencias comerciales.

---

## 5. Recomendaciones para Entornos de Desarrollo

| Escenario | Acción Recomendada |
| :--- | :--- |
| **Reinicio total deliberado** | Aplicar el protocolo de 4 pasos (dormir Relay -> limpiar secundarios -> arrancar Relay). |
| **Borrado de un único nodo local** | Si solo se borra el `.dat` local, al conectarse al Relay adoptará la cadena viva automáticamente (comportamiento P2P normal). |
| **Auditoría de eventos pasados** | Consultar en PostgreSQL con `WHERE is_active = false` o llamar al endpoint `GET /notifications?includeArchived=true`. |
| **Mantenimiento en producción** | Nunca eliminar `blk00000.dat` en producción a menos que se trate de un hard-fork planificado o un reseteo pactado de testnet. |

---

## 6. Evidencia Empírica y Análisis Forense de Logs Reales (Railway + Seenode)

A continuación se documenta el análisis forense de la telemetría real capturada durante la ejecución exitosa de este protocolo entre el nodo secundario en **Railway** (`magnumslocal-production-9875.up.railway.app`) y el Relay en **Seenode** (`app.blockswine.com`).

### 6.1. Fase 1: Arranque limpio de Railway y Génesis autónomo (`10:44:49 - 10:44:50`)

```text
2026-10-02T10:44:50 [Blockchain] No blockchain file found, will create genesis
2026-10-02T10:44:50 [Blockchain] Genesis block created and saved
2026-10-02T10:44:50 Blockchain initialized (persisted): 1 blocks
2026-10-02T10:44:50 [CHAIN_INDEXER] Verificando alineación BD-Blockchain (bloques: 1, genesis: 000000000019d668...)
2026-10-02T10:44:50 [DATABASE] ✅ Conexión a PostgreSQL establecida
2026-10-02T10:44:50 [CHAIN_INDEXER] Estado inicial limpio: no hay eventos huérfanos activos.
2026-10-02T10:44:50 [INIT][DB Sync] Tablas burn_events y notifications migradas y sincronizadas correctamente
```

* **Diagnóstico:** Al no encontrar `blk00000.dat`, Railway creó su bloque Génesis determinista (`chain.length === 1`).
* **Base de Datos:** La migración DDL (`dbReadyPromise`) ejecutó sin errores de Sequelize (`column "genesis_hash" does not exist` solventado), y `chainIndexerService` constató que no existían eventos huérfanos activos.

---

### 6.2. Fase 2: Ventana de Aislamiento con Seenode Dormido (`10:44:50 - 10:47:10`)

Durante más de dos minutos, Railway intentó conectarse periódicamente al Relay cada 5 segundos:

```text
2026-10-02T10:44:50 [P2P][DEBUG] Intentando conectar a peer: wss://app.blockswine.com:443
2026-10-02T10:44:50 [P2P][DEBUG][ERROR][Cliente] Socket error al conectar a peer: {
    peer: 'wss://app.blockswine.com:443',
    message: 'Unexpected server response: 502'
}
2026-10-02T10:44:50 [P2P][DEBUG] 🔄 Reintentando conexión a wss://app.blockswine.com:443 en 5 segundos...
```

* **Interpretación del error 502 (Bad Gateway):** Traefik (el balanceador de Seenode) respondía al TLS en el puerto 443, pero el contenedor de Seenode estaba detenido/durmiendo.
* **Efecto protector:** Railway estuvo protegido contra cualquier propagación de los 4 bloques anteriores. Permaneció en espera con su bloque Génesis intacto.

---

### 6.3. Fase 3: Reactivación de Seenode y Handshake Cruzado (`10:47:10`)

Al completarse el nuevo despliegue limpio de Seenode, la conexión se restableció en ambas direcciones:

```text
2026-10-02T10:47:10 🔗 Nueva conexión entrante al relay desde: 94.237.31.199, 152.233.12.245
2026-10-02T10:47:10 [+] Socket connected (inbound) [total sockets: 1]
2026-10-02T10:47:10 🤝 [HANDSHAKE] recibido de Relay_master-blockswine [relay] - http://192.168.7.153:6001
2026-10-02T10:47:11 [+] Socket connected (outbound) [total sockets: 2]
2026-10-02T10:47:11 [P2P][DEBUG] ✅ Conectado exitosamente a peer: wss://app.blockswine.com:443
```

Ambos nodos intercambiaron sus metadatos (NodeID, URLs internas, altura de cadena) y quedaron interconectados por WebSocket.

---

### 6.4. Fase 4: Consenso y Aclaración de `[REJECTED]` (`10:47:10 - 10:47:11`)

Seenode transmitió su cadena de longitud 1 a Railway:

```text
2026-10-02T10:47:10 [P2P][CHAIN][RECEIVED] ⛓️  Recibida nueva cadena desde peer. Longitud: 1
2026-10-02T10:47:10 replaceChain llamado. Longitud anterior: 1, hash último bloque local: 000000000019d668...
2026-10-02T10:47:10 [REPLACECHAIN][INFO] Received chain is not longer than the current chain.
2026-10-02T10:47:10 [P2P][CHAIN][RESULT] replaceChain ejecutado. Longitud nueva: 1
2026-10-02T10:47:10 [P2P][CHAIN][REJECTED] La cadena recibida fue rechazada o no se pudo persistir en disco.
2026-10-02T10:47:10 [P2P][CHAIN][FINAL] Cadena local actualizada: 1 bloques 
2026-10-02T10:47:10   Genesis: 000000000019d668... 
2026-10-02T10:47:10   Último: 000000000019d668... (height: 1)
```

* **Significado real de `[P2P][CHAIN][REJECTED]`:** 
  Dado que la regla de consenso exige que la cadena entrante sea **estrictamente más larga** ($L_{entrante} > L_{local}$), al tener ambas longitud 1 ($1 \le 1$), `replaceChain` devuelve `false`. 
  **No es un error**: es la confirmación matemática de que ambos nodos ya poseen el mismo bloque génesis y ningún nodo necesita sobrescribir sus datos.

---

### 6.5. Fase 5: Estabilización del Rebroadcast (`10:47:11`)

Durante una fracción de segundo, el reenvío P2P generó trazas repetidas de `[REBROADCAST][CHAIN]`:
* **Causa:** Al existir dos sockets abiertos entre los mismos nodos (`inbound` y `outbound`), el mensaje `CHAIN` rebotó entre ambos sockets hasta agotarse en los búferes.
* **Resultado:** La altura se mantuvo inmutable en 1 en todas las iteraciones. Ningún bloque espurio ni la cadena vieja de 4 bloques fue reincorporada.

---

### 6.6. Matriz de Validación de Estado Final

| Componente | Estado Observado | Veredicto |
| :--- | :--- | :--- |
| **Blockchain Local (Railway)** | Longitud 1 (`000000000019d668...`) | ✅ Limpio |
| **Blockchain Relay (Seenode)** | Longitud 1 (`000000000019d668...`) | ✅ Limpio |
| **Consenso P2P** | $1 = 1$, sincronizados sin reemplazo forzado | ✅ Alineado |
| **Base de Datos (PostgreSQL)** | `first_seen_source`, `genesis_hash`, `is_active` operativos | ✅ Estable |

