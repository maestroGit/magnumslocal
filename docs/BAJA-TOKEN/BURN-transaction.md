# Proceso de BURN (Baja) desde el nuevo frontend
# 2026/03/19

Este documento describe, paso a paso, cómo funciona el flujo de BURN (baja definitiva) implementado en el nuevo frontend, concretamente desde la vista `public/consume-keystore.html` y su lógica `public/consume-keystore.js`. Incluye el proceso de firma en cliente, las rutas de backend involucradas, validaciones y respuestas esperadas.

## Resumen Ejecutivo
- El usuario importa su keystore y selecciona un UTXO a consumir (quemar).
- La clave privada NUNCA sale del navegador: se deriva con `scrypt` y se descifra localmente con `AES-GCM`.
- La transacción de BURN se construye y firma en el cliente (señalando como destino la dirección de burn `0x0000000000000000000000000000000000000000`).
- El cliente envía al backend una `signedTransaction` vía `POST /transaction`.
- El backend valida estructura, existencia de UTXOs, firma y doble gasto; si es válida, la difunde a la red (mempool y P2P). El minado se hace aparte (`POST /mine`).

## Prerrequisitos y contexto de UI
- Página: `public/consume-keystore.html` (carga `public/consume-keystore.js`).
- El usuario debe haber importado su keystore previamente (se guarda en `sessionStorage` como `importedKeystore` y la `publicKey` como `importedPubKey`).
- La pantalla lista los UTXOs disponibles del usuario (consulta backend) y permite:
	- Seleccionar 1 UTXO para consumir.
	- Introducir su passphrase (para descifrar el keystore y firmar).
	- Elegir una "Bodega" (winery) de forma dinámica desde la base de datos. El sufijo de la dirección de burn se construye con el ID de la bodega seleccionada.

## Endpoints de backend usados por el frontend
- GET `/users?role=winery`
	- Devuelve lista de bodegas (usuarios con rol `winery`) desde la base de datos.
	- Respuesta: `{ success: true, data: [{ id, nombre, email, ... }], count, ... }`.
	- Se usa para poblar dinámicamente el select de bodegas al cargar la página (`consume-keystore.js`).

- GET `/utxo-balance/:address`
	- Devuelve `{ address, balance, utxos }` para la dirección solicitada.
	- Se usa para listar UTXOs seleccionables en la UI.

- POST `/transaction` (flujo “usuario” con signedTransaction)
	- Cuerpo: `{ signedTransaction: { id, inputs[], outputs[] } }`.
	- Valida la transacción pre-firmada y, si es correcta, la agrega a la mempool y la difunde P2P.
	- Respuesta exitosa: `{ success: true, message: "Signed transaction accepted", transactionId }`.

- GET `/address-history/:address` (opcional para seguimiento)
	- Devuelve `{ address, history[] }` incluyendo eventos recibidos/transferidos/quemados, con estado `mined` o `pending`.

- POST `/mine` (minado manual opcional)
	- Intenta minar las transacciones en mempool. Útil para entorno de desarrollo o pruebas.

Notas:
- Existe un endpoint adicional `POST /baja-token` (flujo legacy o servidor-firma) que permite que el backend firme en nombre del usuario (recibiendo `keystore` y `passphrase`). En el flujo actual “nuevo frontend”, NO se usa; el navegador firma y envía `signedTransaction` a `/transaction`.

## Selección y salvaguarda de UTXOs en la UI
- El listado de UTXOs se obtiene con `GET /utxo-balance/:address` y se muestra para selección.
- Se marcan localmente como “pendientes” aquellos UTXOs ya usados en una transacción enviada pero aún no minada.
	- Claves en `sessionStorage`:
		- `pendingBurnUtxos`: UTXOs enviados por BURN pendientes de minado.
		- `pendingUtxos`: UTXOs de transferencias normales pendientes.
	- Si un UTXO aparece en cualquiera de las dos listas, se deshabilita su selección y se muestra el badge “Pendiente de minar”.
- Tras enviar una transacción, el UTXO utilizado se añade a `pendingBurnUtxos` y se refresca la lista. También se “purgan” claves que ya no existan en el set actual de UTXOs del backend.

## Proceso de firma en el cliente (consume-keystore.js)
1. **Carga dinámica de bodegas (al iniciar la página)**:
	 - Se ejecuta `loadBodegas()` de forma asíncrona al cargar `consume-keystore.js`.
	 - Se hace un `fetch` a `GET /users?role=winery` con credenciales (`credentials: 'include'`).
	 - Se mapea cada bodega de la respuesta a un objeto `BURN_MOTIVES[bodega_id] = { label: bodega.nombre, suffix: bodega.id.toUpperCase() }`.
	 - El select `#burnReason` se rellena dinámicamente con estas opciones. Incluye siempre una opción por defecto "Select Cellar".
	 - Si falla la carga, se mantiene la configuración de fallback con solo la opción por defecto.

2. Derivación de clave (KDF):
	 - Se usa `scrypt` en el navegador con parámetros: `N=16384`, `r=8`, `p=1`, `keylen=32`.
	 - Salt y parámetros provienen del keystore (`keystore.kdfParams.salt`).

3. Descifrado del keystore (AES-GCM):
	 - Con la clave derivada se importa `AES-GCM` y se descifra `encryptedPrivateKey` usando `iv` del keystore.
	 - Se normaliza la clave privada resultante a hex de 32 bytes (64 chars), aceptando variantes comunes (con `0x`, 128 chars, 32 chars interpretados como bytes, etc.).

4. Comprobación opcional de correspondencia:
	 - Se deriva la `publicKey` con `secp256k1` y se compara con `keystore.publicKey` para asegurar que el keystore corresponde al UTXO seleccionado.

5. Construcción de la transacción de BURN:
	 - Inputs: un único input con `{ txId, outputIndex, address, amount }` del UTXO seleccionado.
	 - Outputs: un único output al burn address construido dinámicamente usando el sufijo de la bodega seleccionada:
	 	- Dirección: `0x0000000000000000000000000000000000000000<BODEGA_SUFFIX>` (donde `BODEGA_SUFFIX` es el `id.toUpperCase()` limitado a 20 caracteres).
	 	- Por ejemplo, si la bodega es `"bodega-001"`, el suffix será `"BODEGA-001"`, resultando dirección: `0x0000000000000000000000000000000000000000BODEGA-001`.

6. Firma de la transacción:
	 - Se calcula el hash de `outputs` como `SHA-256(JSON.stringify(outputs))`.
	 - Se firma ese hash con `secp256k1` (noble), obteniendo un objeto `{ r, s }`.
	 - La firma se adjunta a cada input: `input.signature = { r, s }`.

7. Cálculo del `tx.id`:
	 - `hash1 = SHA-256(JSON.stringify({ inputs: signedInputs, outputs }))`.
	 - `id = SHA-256(hash1)` (doble SHA-256), en hex.

8. Envío al backend:
	 - `POST /transaction` con `{ signedTransaction: { id, inputs, outputs }, origin: <bodega_id>, type: 'quemada' }`.
	 - Base URL resuelta según host:
		 - Desarrollo: `http://localhost:6001`
		 - Producción: `https://app.blockswine.com`
		 - Seenode (deploy): `https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com`

## Validaciones y lógica en backend (POST /transaction)
Cuando el backend recibe `signedTransaction` (flujo “usuario”):
1. Valida estructura básica: arrays `inputs` y `outputs` presentes.
2. Verifica existencia de cada input en el `utxoSet` actual: el par `{ txId, outputIndex, address, amount }` debe existir y no estar gastado.
3. Verifica la firma: `Transaction.verifyTransaction(signedTransaction)`
	 - El backend re-hashea `outputs` igual que el cliente (`ChainUtil.hash(outputs)`), y verifica cada firma `r,s` contra la `address` del input.
4. Enriquecimiento de trazabilidad (`origin`):
	 - Si el request trae `origin` (caso BURN/Opened), se conserva en la transacción.
	 - Si el request no trae `origin` (caso transfer entre winelovers), el backend intenta heredarlo desde la transacción padre referenciada por los inputs (`parentTx.origin`).
	 - Regla de negocio: NO se infiere `origin` desde el sufijo de direcciones burn `0x000...SUFFIX`.
5. Doble gasto en mempool: intenta añadir a la mempool (`TransactionsPool`); si el input ya está referenciado por otra tx pendiente, rechaza (400) con mensaje de “doble gasto”.
6. Difusión P2P: si es válida, se propaga a peers; queda en mempool hasta que se mine (`POST /mine`).

Respuesta típica de éxito:
```json
{
	"success": true,
	"message": "Signed transaction accepted",
	"transactionId": "<id-hex>"
}
```

Errores comunes:
- 400 Malformed signedTransaction (estructura incorrecta).
- 400 One or more inputs reference non-existing or spent UTXOs.
- 400 Invalid transaction signature (firma inválida o address no corresponde).
- 400 Double-spend detected in mempool.
- 500 Error processing signed transaction (excepción interna).

## Ejemplo de payload de BURN (cliente → backend)
```json
{
	"signedTransaction": {
		"id": "<doble-sha256-de-inputs-y-outputs>",
		"inputs": [
			{
				"txId": "<txid-del-utxo>",
				"outputIndex": 0,
				"address": "<publicKey-del-propietario>",
				"amount": 1,
				"signature": { "r": "<hex>", "s": "<hex>" }
			}
		],
		"outputs": [
			{ "amount": 1, "address": "0x0000000000000000000000000000000000000000<BODEGA_ID_UPPERCASE>" }
		]
	},
	"origin": "<bodega-id>",
	"type": "quemada"
}
```

Notas:
- El `address` del output incluye el suffix dinámico de la bodega seleccionada.
- El campo `origin` contiene el ID de la bodega para trazabilidad en el backend.
- El campo `type` categoriza la transacción como "quemada" (burn).

## Trazabilidad de origin en transferencias
- Objetivo: que el receptor pueda ver de qué bodega proviene el token sin agregar selector extra en `transfer-keystore.html`.
- Flujo aplicado:
	- BURN/Opened: `origin` llega explícito desde el frontend (`origin: <bodega_id>`).
	- Transfer winelover -> winelover: si no se envía `origin`, se hereda automáticamente desde `parentTx.origin`.
- Regla estricta:
	- No reconstruir `origin` leyendo direcciones burn `0x000...SUFFIX`.
	- Las direcciones burn representan desaparición/cierre de ciclo, no fuente para inferencia de nuevas transferencias.
- Visualización:
	- `GET /address-history/:address` devuelve `origin` cuando existe.
	- El historial muestra esa referencia para facilitar decisiones de Opened/BURN posteriores.

## Seguimiento y estados
- Mientras la transacción está en mempool, el UTXO consumido aparece como “Pendiente de minar” en la UI (control local) y como `pending` en el historial (`GET /address-history/:address`).
- Una vez minada (bloque nuevo), ya no aparecerá como UTXO disponible; el historial mostrará el evento como `quemada` con `status: "mined"`.

## Diferencias con el endpoint legacy `/baja-token`
- `/baja-token` implementa un flujo en el que el backend firma la transacción a partir de un keystore y passphrase enviados por el cliente, y permite motivo `burn` o `bodega` para elegir destino.
- En el “nuevo frontend” se prefiere firmar en cliente y usar `POST /transaction` con `signedTransaction` (más seguro: la passphrase nunca toca el servidor).

## Seguridad y mejores prácticas
- La passphrase del usuario NUNCA se envía al backend.
- La clave privada se descifra y usa sólo en el navegador para firmar.
- Usar siempre HTTPS en producción para proteger el keystore y la firma en tránsito.
- Validar que el UTXO seleccionado pertenezca a la `publicKey` del keystore importado (la UI ya bloquea si no coincide).

## Rutas de referencia en el repositorio
- Frontend:
	- `public/consume-keystore.html` → Select dinámico de bodegas
	- `public/consume-keystore.js` → Función `loadBodegas()` que consulta `/users?role=winery` al iniciar
	- `public/utxo-api.js` → API de UTXOs
- Backend (Express):
	- `server.js` → rutas `/users?role=winery`, `/utxo-balance/:address`, `/address-history/:address`, `POST /transaction`, `POST /mine`, `POST /baja-token` (legacy)
	- `app/routes/userRoutes.js` → Endpoint GET `/users` com filtro `role=winery`
	- `app/controllers/userController.js` → Lógica de `getUsers()` que devuelve bodegas de la BD
	- `wallet/transactions.js` → Verificación de firmas y modelo UTXO
	- `wallet/chainUtils.js` → Hashing y verificación ECDSA secp256k1

## Cambios en la implementación (v2 - Carga dinámica de bodegas)
**Versión anterior (v1)**:
- Las bodegas estaban hardcodeadas en `BURN_MOTIVES` dentro de `consume-keystore.js`.
- No permitía agregar nuevas bodegas sin modificar el código frontend.

**Versión actual (v2)**:
- Las bodegas se cargan dinámicamente desde la base de datos al iniciar la página.
- La función `loadBodegas()` ejecuta `GET /users?role=winery` desde el endpoint de usuarios.
- Cada bodega registrada en la BD con rol `winery` aparece automáticamente en el select.
- El sufijo del burn address se construye dinámicamente a partir del ID de la bodega seleccionada.
- Las opciones se actualizan sin necesidad de redeploy del frontend.

**Beneficios**:
- Gestión centralizada de bodegas desde la BD.
- Escalabilidad: agregar/editar bodegas sin modificar frontend.
- Trazabilidad: el `origin` y `address` de burning reflejan la bodega real.
- Trazabilidad extendida: las transferencias entre winelovers pueden conservar el `origin` por herencia de metadato (`parentTx.origin`).

## Notas de despliegue
- La base de API se resuelve por hostname en el frontend:
	- Local: `http://localhost:6001`
	- Producción: `https://app.blockswine.com`
	- Seenode: `https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com`
- Asegurarse de que `CORS` y `helmet` permitan estos orígenes (ya configurado en `server.js`).

---
### Reflexión sobre el formato de dirección burn

El uso del prefijo largo `0x0000000000000000000000000000000000000000` seguido del sufijo de la bodega (en mayúsculas y limitado a 20 caracteres) tiene ventajas importantes:

- **Compatibilidad y unicidad**: Este prefijo es un estándar en blockchains para indicar una dirección “nula” o “burn”, evitando colisiones accidentales con direcciones reales y facilitando la auditoría.
- **Prevención de errores**: Es muy difícil que una dirección de usuario real coincida accidentalmente con una dirección burn, protegiendo contra errores de transferencia.
- **Facilidad de filtrado**: El backend y frontend pueden identificar rápidamente todas las transacciones de burn buscando ese prefijo, sin riesgo de falsos positivos.
- **Auditoría y trazabilidad**: En exploradores y análisis, es inmediato distinguir los movimientos a burn address, facilitando la transparencia.
- **Estándar cross-chain**: Si en el futuro se integran otros sistemas/blockchains, este formato es ampliamente reconocido y aceptado.

El único "costo" es que el sufijo (id de bodega) se recorta a 20 caracteres, pero normalmente los IDs relevantes caben en ese espacio. El formato actual es seguro, robusto y compatible con buenas prácticas de blockchain.
---

