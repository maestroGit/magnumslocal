TRANSACTION-SIGNED
===================

Resumen del problema detectado
-----------------------------

Durante la integración del demo-wallet (BlocksWine) y el nodo `magnumsmaster` observamos un comportamiento donde la creación de transacciones desde una publicKey cargada en el servidor era rechazada con el mensaje:

❌ Transacción rechazada: wallet sin clave privada

Causa raíz
----------

- El servidor carga (o se le pasa) un fichero JSON tipo keystore desde `app/uploads/wallet_default.json` y construye `global.wallet` con `new Wallet(publicKey, INITIAL_BALANCE, privateKey)`.
- En muchos casos el fichero que se genera en la UI es un keystore que contiene `encryptedPrivateKey` (y parámetros KDF/cipher), no la `privateKey` en claro.
- Al crear `global.wallet` con un JSON que no incluye `privateKey` en claro, `global.wallet.privateKey` queda `undefined` y cualquier intento de crear/firmar transacciones en el servidor falla: el servidor no puede firmar sin la clave privada.

Observación operacional
----------------------

- En la rama `transaction-signed` hemos decidido seguir una estrategia más segura y multi-nodo amigable: evitar cargar privateKeys en el servidor.
- En entornos reales, la clave privada debe permanecer bajo control del usuario (cliente/usuario final) y nunca almacenarse en texto claro en el servidor.

Solución adoptada (Opción C - implementada en esta rama `transaction-signed`)
-----------------------------------------------------------------------------

No cargues la wallet privada en el servidor. En su lugar:

1. Mantén la wallet en la UI (cliente, navegador) — el cliente gestiona la clave privada.
2. Cuando el usuario quiera enviar fondos, el cliente crea y firma la transacción localmente (con la clave privada del usuario).
3. El cliente envía la transacción ya firmada al servidor a través de un endpoint `/transaction` modificado que acepta transacciones firmadas.
4. El servidor valida la firma, comprueba entradas/saldos (UTXOs) y, si es válida, difunde la transacción a la mempool/p2p.

Beneficios
---------

- La clave privada nunca sale del navegador/cliente.
- Fácil de escalar a multi-nodo: cualquier servidor puede aceptar transacciones firmadas sin necesidad de disponer de secretos.
- Mejora la seguridad y reduce la superficie de riesgo por exposición del private key.

Detalles de implementación recomendados
-------------------------------------

1. Cambios en el cliente (UI):
   - Generar la transacción (inputs/outputs) y firmarla localmente.
   - Enviar al servidor un payload JSON como:
     {
       "signedTransaction": { ... } // estructura que incluye id, inputs, outputs y signature
     }

2. Cambios en el servidor (en la rama `transaction-signed`):
   - Actualizar POST `/transaction` para aceptar un payload con `signedTransaction`.
   - Validar la estructura y las firmas de la transacción usando `Transaction.verifyTransaction()` (se añade la comprobación de utxos y existencia de inputs).
   - Verificar que las entradas (txId/outputIndex) existen y no han sido gastadas (UTXO set).
   - Añadir la transacción a `tp.transactions` y retransmitir con `p2pServer.broadcastTransaction`.
   - Se mantiene el flujo legacy (recipient + amount) que firma en servidor solo si `global.wallet.privateKey` está cargada.

3. Validaciones de seguridad:
   - Comprobar nonce / id / formato para mitigar replay attacks si procede.
   - Limitar tamaño del request y aplicar rate limiting al endpoint.
   - Registrar metadata mínima (no claves privadas) para auditoría.

4. UX / Mensajes de error:
   - Si el cliente envía un keystore sin `privateKey` en claro, devolver un mensaje claro: "Keystore cifrado detectado: use la UI para firmar localmente o proporcione passphrase para descifrar".
   - Mensajes claros cuando la firma no valida o cuando faltan UTXOs.

Notas sobre alternativas
-----------------------

- Opción A (menos segura): colocar `privateKey` en el servidor en claro para pruebas. No recomendado en entornos compartidos.
- Opción B (segura, pero requiere integración): aceptar `encryptedPrivateKey` y `passphrase` y descifrar en el servidor con el mismo KDF/cipher que usa el cliente. Esto requiere manejo seguro de passphrases y consideraciones de seguridad adicionales (evitar logging y proteger memoria).

Siguientes pasos y recomendaciones
---------------------------------

- Mantener la rama `transaction-signed` y realizar una PR con tests unitarios que:
  - Validen que `/transaction` acepta transacciones firmadas.
  - Validen que transacciones con firmas inválidas son rechazas.
  - Validen la integración con `tp` y `p2pServer.broadcastTransaction`.

- Añadir documentación de la API para la nueva ruta `/transaction` con ejemplos de request/response.
- Considerar un endpoint `POST /sign-transaction` sólo para el caso en que se implemente un flow server-side de descifrado de keystores (Opción B).

Cambios aplicados en esta rama (`transaction-signed`)
--------------------------------------------------

- `server.js`:
   - POST `/transaction` ahora acepta `signedTransaction` y valida utxos + firma usando `Transaction.verifyTransaction()`.
   - Se exporta `app` al final del fichero para permitir tests (importación por `supertest`).
   - En modo test (`NODE_ENV=test` o `NO_P2P=true`) se usan stubs para `p2pServer` y `miner` para evitar sockets durante las pruebas.

- `test/transactionSigned.test.js`:
   - Test Jest básico que intenta POSTear un `signedTransaction` a `/transaction` usando `supertest`.
   - El test es tolerante a entornos sin `supertest` (se salta si falta la dependencia), para no romper en máquinas sin `npm install`.

Cómo ejecutar los tests (local)
-----------------------------

1. Instala dependencias (incluye `supertest` en devDependencies):

```bash
cd C:/Users/maest/Documents/magnumsmaster
npm install
```

2. Ejecuta solo el test nuevo (recomendado):

```bash
npx jest test/transactionSigned.test.js --runInBand
```

3. Para ejecutar toda la suite de tests (puede fallar si otros tests asumen entorno distinto):

```bash
npm test -- --runInBand
```

Notas sobre la ejecución de tests
--------------------------------
- Si `npm install` falla por versiones no encontradas, ajusta `package.json` (por ejemplo: `supertest` a `^6.3.3`) y vuelve a ejecutar `npm install`.
- El test agregado es un caso de integración ligero; para asegurar robustez, añade tests unitarios que inyecten UTXOs y firmen transacciones programáticamente.

¿Qué sigue?
------------
- Puedo:
   - A) Añadir tests que construyan y firmen transacciones válidas con claves generadas en la suite y que comprueben aceptación completa por `/transaction`.
   - B) Implementar un ejemplo en la UI que construya una transacción en cliente, la firme y la envíe al endpoint `/transaction`.
   - C) Añadir rate-limiting y validaciones anti-replay en `/transaction`.

Di cuál quieres que implemente a continuación y lo añado en la rama `transaction-signed`.

Registro de cambios en esta rama
--------------------------------

- Se documenta y adopta el flujo "signed transactions from client" como solución por defecto en `transaction-signed`.

Contacto
--------

Si quieres que implemente ahora la modificación del endpoint `/transaction` para que acepte `signedTransaction`, o que añada los tests automáticos, dime y lo hago en la rama `transaction-signed`.

Registro adicional: ejemplo de keystore usado en pruebas
------------------------------------------------------

Durante las pruebas locales hemos usado un keystore generado por la UI del demo-wallet. A continuación se incluye el contenido relevante (omitimos la privateKey en claro, el keystore contiene la clave cifrada):

```json
{
   "keystoreVersion": 1,
   "id": "web-demo-1760967173350",
   "createdAt": "2025-10-20T13:32:53.350Z",
   "createdBy": "web-demo",
   "kdf": "scrypt",
   "kdfParams": { "salt": "0a35c7b57223fab1eb83c04dc282207f" },
   "cipher": "aes-256-gcm",
   "cipherParams": { "iv": "a832ae47f3acb910411c2ad2" },
   "publicKey": "04de93123119ad89e79cac3eb01c8530959fef7c4e7ce75e91d850d318631a8a9ca7202b343be992f7e84aef403eba6482b736a828310a2f7f304c38a6d49b1b96",
   "encryptedPrivateKey": "<omitted for brevity>"
}
```

Notas sobre este keystore
- El `publicKey` (encabezado `04...`) es la clave pública asociada y se puede usar directamente en la UI de demo para firmar/verificar.
- El `encryptedPrivateKey` permanece cifrado y para usarlo en la demo es necesario proporcionar la passphrase en la sección "Importar keystore".

Nueva funcionalidad UI: "Verificar firma"
--------------------------------------

Se añadió una sección en el demo-wallet para verificar firmas localmente. Objetivo práctico:

- Permitir al desarrollador o a un auditor pegar `publicKey`, pegar una firma (JSON con `{r,s}`) y verificar inmediatamente si la firma coincide con el `payload` mostrado en el textarea.
- El verificador intenta dos modos comunes:
   1. Verificación sobre bytes crudos del `payload` (modo actual del botón "Firmar payload").
   2. Verificación sobre SHA256(payload) — útil si se prefiere firmar hashes canónicos.

Cómo usar la sección "Verificar firma":

1. Importa el keystore en la UI (o copia el `publicKey` del keystore mostrado arriba y pégalo en el campo "PublicKey").
2. En "Firmar payload" pulsa "Firmar" y copia el JSON de la firma `{ "r": "...", "s": "..." }` que aparece.
3. Pega la `publicKey` y la firma en los campos de "Verificar firma" y pulsa "Verificar firma".
4. La UI mostrará si la firma es `VALID (raw-bytes)` o `VALID (SHA256(payload))` o `INVALID`.

Recomendación
-------------
Para producción o demos más rigurosos, normaliza el payload como JSON canónico y firma su SHA256. En el demo actual mantenemos compatibilidad con las dos formas para facilitar pruebas rápidas.

Pero en el contexto de firmas/mentes/transferencias es más natural usar:

"mensaje" o "mensaje a firmar" (más corto y claro), o
"contenido (a firmar)" o "datos a firmar".
Qué significa aquí: el payload es exactamente los bytes que se van a firmar. Puede ser:

Texto plano (ej. "hello world"), o
Un JSON estructurado (ej. {"nonce":123,"ts":"...","action":"pay"}), o
El hash (ej. SHA256) de ese JSON canónico.
Por qué importa: la firma se calcula sobre esos bytes. Si el verificador no trata exactamente el mismo payload (mismo encoding, mismo orden de campos, mismo hash), la verificación fallará. Por eso en aplicaciones reales hay que:

Normalizar/canonizar los datos (por ejemplo ordenar campos y usar UTF‑8).
Incluir un nonce y timestamp para evitar replays.
Preferir firmar el hash canonical (p. ej. SHA256(JSON_canonico)) en lugar de firmar texto libre.
Recomendación para la UI/demo:

En vez de mostrar "payload" pon "Mensaje a firmar" o "Datos a firmar (payload)".
Para demos realistas auto‑llenar con JSON:
{"nonce": 123456, "ts": "2025-10-20T13:45:00Z", "note": "probar firma"}
Y cambiar la firma a: firma = sign( SHA256(JSON_canonico) ).