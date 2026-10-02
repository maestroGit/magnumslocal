# Sincronización de Base de Datos y Versionado por Genesis Hash

**Fecha de documento:** 2 de octubre de 2026 (2026-10-02)  
**Proyecto:** magnumslocal / BlocksWine  
**Ubicación:** `docs/PERSISTENCIA/sincronizacion-bd-genesis.md`

---

## 1. Resumen y Contexto

Al actualizar el repositorio, desplegar nuevos nodos o reiniciar la red eliminando el archivo binario secuencial (`storage/data/blk00000.dat`), la blockchain arranca desde el bloque génesis (`chain.length === 1`). 

Sin embargo, la base de datos relacional (PostgreSQL / Sequelize) conserva registros previos en tablas derivadas de la cadena, como `burn_events` y `notifications`. 

### Problemas identificados:
1. **Discordancia de estado:** Si se mantiene la base de datos intacta tras un reseteo de la cadena, el dashboard muestra eventos de quema y notificaciones que ya no existen en la blockchain activa.
2. **Riesgo de pérdida de datos por error humano:** Si se aplicase un vaciado ciego (`TRUNCATE`), un borrado accidental de `blk00000.dat` o un error en un script de despliegue destruiría la única evidencia histórica de transacciones, perjudicando la auditoría y trazabilidad del proyecto.

---

## 2. Arquitectura de la Solución (Estrategia A)

Se implementa una arquitectura basada en **Blockchain como Fuente Única de Verdad (SSOT)** y **Base de Datos como Proyección Versionada No Destructiva**:

```
                         ┌─────────────────────────────┐
                         │   storage/data/blk00000.dat │
                         │ (Fuente de la Verdad SSOT)  │
                         └──────────────┬──────────────┘
                                        │
                                 bc.initialize()
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
    [syncUTXOManagerWithBlockchain]               [syncDatabaseWithBlockchain]
       - Reconstruye UTXO set                       - Evalúa longitud de chain
       - En memoria (RAM)                           - Si chain <= 1 y hay eventos:
                                                      Archiva histórico (is_active=false)
                                                    - Si chain > 1:
                                                      Reconcilia genesis_hash activo
```

### Principios clave:
* **Versionado por `genesis_hash`:** Cada evento de quema y notificación se etiqueta con el hash del bloque génesis de la cadena en la que fue emitido.
* **Archivado seguro (`is_active = false`):** Si se detecta un reinicio de la cadena a nivel génesis, los registros anteriores no se borran; simplemente se marcan como inactivos/archivados.
* **Aislamiento visual en dashboards:** Las consultas activas (`GET /notifications`) filtran automáticamente por la cadena viva (`is_active = true` y `genesis_hash`), mientras que la evidencia histórica queda resguardada para auditoría.

---

## 3. Esquema de Datos y Modificaciones en Modelos

### 3.1. Tabla `burn_events` (`app/models/BurnEvent.js`)
Se añadieron los campos:
* `genesis_hash` (`VARCHAR(64)`, `allowNull: true`): Hash del bloque génesis de la cadena de bloques activa.
* `is_active` (`BOOLEAN`, `defaultValue: true`, `allowNull: false`): Bandera para indicar si pertenece a la cadena activa o a un ciclo archivado.
* **Índices:** `idx_burn_events_genesis_hash` e `idx_burn_events_is_active`.

### 3.2. Tabla `notifications` (`app/models/Notification.js`)
Se añadieron los campos:
* `genesis_hash` (`VARCHAR(64)`, `allowNull: true`).
* `is_active` (`BOOLEAN`, `defaultValue: true`, `allowNull: false`).
* **Índices:** `idx_notifications_genesis_hash` e `idx_notifications_is_active`.

---

## 4. Componentes y Servicios

### 4.1. Servicio Reconciliador (`app/services/chainIndexerService.js`)
Servicio dedicado que gestiona el ciclo de vida y alineación entre la base de datos y la blockchain:

* **`syncDatabaseWithBlockchain(blockchain)`**:
  - Detecta si la cadena está en génesis (`chainLength <= 1`).
  - Si existen registros activos anteriores en BD, emite advertencia y ejecuta un archivado seguro:
    ```javascript
    await BurnEvent.update({ is_active: false }, { where: { is_active: true } });
    await Notification.update({ is_active: false }, { where: { is_active: true } });
    ```
  - Si la cadena tiene bloques previos (`chainLength > 1`), reconcilia transacciones activas asociando el `genesis_hash` correspondiente.
* **`getHistoricalBurnStats()`**:
  - Permite consultar estadísticas de eventos agrupados por `genesis_hash` e `is_active` para reportes de auditoría.

### 4.2. Notificaciones (`app/services/notificationService.js`)
* `buildBurnNotificationData` y `persistBurnNotification` ahora reciben y persisten `genesisHash` e `isActive`.
* Si un evento ya existía sin `genesis_hash`, se actualiza retroactivamente.

### 4.3. Minado (`app/controllers/miningController.js`)
* En `mineBlock()`, al detectar transacciones BURN en el nuevo bloque minado, obtiene el `genesis_hash` desde `global.bc.chain[0].hash` y persiste tanto en `BurnEvent` como en `Notification` con `is_active: true`.

### 4.4. Consenso P2P (`src/blockchain.js`)
* En `replaceChain(newChain)`, los nuevos bloques aceptados se procesan registrando eventos vinculados al `genesis_hash` de la cadena recibida (`newChain[0].hash`).

### 4.5. Controlador de Notificaciones (`app/controllers/notificationController.js`)
* `GET /notifications?wineryId=xxx`:
  - **Por defecto:** Retorna únicamente notificaciones de la cadena viva (`where: { is_active: true, genesis_hash: currentGenesisHash }`).
  - **Modo auditoría:** Permite el parámetro `?includeArchived=true` para recuperar todo el histórico acumulado de despliegues previos.

### 4.6. Inicialización del Servidor (`server.js`)
* **Migración DDL no bloqueante:** Al sincronizar Sequelize en el arranque, ejecuta sentencias `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` para garantizar que la base de datos posea las columnas necesarias sin requerir migraciones manuales.
* **Gancho de sincronización:** Ejecuta `await syncDatabaseWithBlockchain(bc)` inmediatamente después de `bc.initialize()` y `syncUTXOManagerWithBlockchain()`.

---

## 5. Ciclo de Vida y Comportamiento Operativo

| Situación | Estado de Blockchain | Estado de PostgreSQL | Resultado en Sistema |
| :--- | :--- | :--- | :--- |
| **Arranque normal** | Cadena con $N$ bloques (`blk00000.dat` existente) | Contiene eventos de la cadena actual | Mantiene todos los registros activos (`is_active: true`). Dashboard operativo sin cambios. |
| **Nuevo deploy / Borrado de `.dat`** | Cadena en génesis (longitud 1) | Contiene eventos de despliegues anteriores | `chainIndexerService` detecta la condición, archiva los registros anteriores (`is_active = false`). El dashboard arranca en 0 notificaciones. **Histórico preservado**. |
| **Reorganización P2P (`replaceChain`)** | Cadena reemplazada por peer más larga | Sincroniza bloques recibidos | Registra nuevos burns con el `genesis_hash` de la cadena adoptada. |
| **Pérdida accidental de `.dat`** | `.dat` borrado por error humano | Registros históricos intactos en BD | Los datos comerciales y de quema no se destruyen. Es posible realizar auditorías o reconstruir saldos. |

---

## 6. Consultas SQL de Soporte y Diagnóstico

### Ver resumen de histórico por épocas de la blockchain:
```sql
SELECT 
  genesis_hash, 
  is_active, 
  COUNT(*) AS total_eventos, 
  SUM(amount) AS total_quemado,
  MIN(fecha) AS primer_evento,
  MAX(fecha) AS ultimo_evento
FROM burn_events
GROUP BY genesis_hash, is_active
ORDER BY primer_evento DESC;
```

### Consultar eventos archivados de cadenas anteriores:
```sql
SELECT tx_id, burn_address, amount, fecha, genesis_hash 
FROM burn_events 
WHERE is_active = false 
ORDER BY fecha DESC;
```

### Purgado manual deliberado (solo si se desea limpiar el entorno local):
```sql
DELETE FROM burn_events WHERE is_active = false;
DELETE FROM notifications WHERE is_active = false;
```
