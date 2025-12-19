# Documentación de `server.js` (magnumsmaster)

## Resumen General
El archivo `server.js` es el núcleo backend del proyecto magnumsmaster. Utiliza Node.js y Express para gestionar rutas HTTP, lógica de negocio blockchain, gestión de wallets, UTXOs, transacciones, minado, y comunicación P2P.

## Organización y Funciones Principales

### 1. Configuración Inicial
- **Importación de módulos:** Express, body-parser, fs, path, y módulos propios (`blockchainClient`, `miner`, `p2pServer`, `validator`).
- **Configuración de middlewares:**
  - `body-parser` para JSON y formularios.
  - Servir archivos estáticos desde `/public`.
  - CORS y cabeceras personalizadas.

### 2. Endpoints Principales
- **Wallet:**
  - Creación, carga y gestión de wallets.
  - Subida de archivos de wallet y lote.
- **UTXO:**
  - Consulta de UTXOs globales (`/utxo-balance/global`).
  - Consulta de UTXOs por dirección.
- **Transacciones:**
  - Envío de transacciones.
  - Consulta de transacciones y pool.
- **Minería:**
  - Inicio de minado manual.
  - Consulta de bloques y estado de la cadena.
- **P2P:** [Ver detalle](\modulos-propios\p2pServer\p2pServer.md)
  - Sincronización de nodos y broadcast de bloques/transacciones.

### 3. Lógica de Negocio
- **Gestión de archivos:**
  - Guardado de archivos JSON en `app/uploads/lotes/` y wallets en `app/uploads/wallets/`.
- **Validación:**
  - Validación de transacciones y bloques.
- **Sincronización:**
  - Comunicación entre nodos vía WebSocket.

### 4. Estructura de Carpetas Relacionadas
- `app/`: Lógica blockchain, minado, P2P, validación.
- `app/uploads/`: Almacenamiento de wallets y lotes subidos.
- `config/`: Configuración global y de tests.
- `public/`: Archivos estáticos frontend.

## Esquema de Flujo Backend
1. **Recepción de petición HTTP (Express).**
2. **Procesamiento de datos (body-parser, validaciones).**
3. **Ejecución de lógica blockchain/minado/UTXO.**
4. **Lectura/escritura de archivos si aplica.**
5. **Respuesta al cliente (JSON, HTML, archivos).**
6. **Sincronización P2P si es necesario.**

## Áreas Funcionales Clave
- **Wallet:** Creación, carga, consulta y gestión de wallets.
- **UTXO:** Consulta y gestión de saldos y outputs no gastados.
- **Transacciones:** Envío, validación y pool de transacciones.
- **Minería:** Minado de bloques y validación.
- **P2P:** Sincronización y broadcast entre nodos.
- **Archivos:** Subida y almacenamiento de wallets/lotes.

## Notas de Mantenimiento
- El backend está modularizado: la lógica blockchain, minado y P2P está en `app/`.
- Los endpoints están documentados y segmentados por funcionalidad.
- El flujo de archivos subidos (wallet/lote) termina en `app/uploads/`.
- La consulta de UTXOs globales se realiza vía `/utxo-balance/global`.

---

> Para detalles específicos de cada endpoint, revisar el código fuente de `server.js` y los módulos en `app/`.
