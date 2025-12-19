# Demo Wallet (Browser) — Migración Crypto, CSP y Flujos

Este documento resume de forma detallada todo el trabajo realizado para estabilizar y securizar la demo de wallet del navegador (directorio `public/demo-wallet/`). El objetivo fue cumplir una Política de Seguridad de Contenidos (CSP) estricta, eliminar dependencias de CDN y polyfills de Node en el frontend, y consolidar los flujos de firma/verificación y envío de transacciones con `secp256k1` usando recursos locales y APIs nativas del navegador.

## Objetivos

- Cumplir CSP (`script-src 'self'`): sin scripts remotos ni import dinámico desde CDN.
- Sustituir SHA-256 de CDN por WebCrypto (`crypto.subtle.digest`).
- Unificar navegación SPA y evitar redirecciones fuera de la vista.
- Migrar la curva `secp256k1` a una librería ESM vendorizada y compatible con navegador.
- Eliminar polyfills de Node (p.ej., `crypto`, `buffer`) del frontend.
- Mantener y probar los flujos: crear/descifrar keystore, firmar/verificar mensajes, enviar transacciones.

## Estructura y archivos relevantes

- `public/demo-wallet/web-demo.html`: Vista SPA con 3 secciones: New Wallet, My Wallet, Sign & Verify.
- `public/demo-wallet/web-demo.js`: Lógica principal de la SPA, hashing local, firma/verificación y envío.
- `public/demo-wallet/web-demo-inline.js`: Comportamiento de cabecera y navegación interna (previene redirecciones externas).
- `public/demo-wallet/vendor/secp256k1.mjs`: Wrapper ligero con API estable para `secp256k1` en navegador.
- `public/demo-wallet/vendor/secp256k1-lib/index.js`: Código ESM vendorizado de `@noble/secp256k1`.
- (Temporal, ya eliminados) `public/node/crypto.mjs`, `public/node/buffer.mjs`: polyfills que se retiraron al migrar completamente a noble + WebCrypto.

## Cambios clave y decisiones

### 1) Hashing SHA-256 con WebCrypto

- Se implementó un helper `sha256Bytes(input)` en `web-demo.js` que usa `crypto.subtle.digest('SHA-256', ...)` y devuelve `Uint8Array`.
- Beneficios: CSP-friendly, sin dependencias remotas; rendimiento nativo; evita el uso de librerías externas para hashing.

### 2) Wrapper `secp256k1` con noble ESM

- Se creó `vendor/secp256k1.mjs` como capa de abstracción, inicialmente puenteando a una librería que requería polyfills de Node (elliptic). Se migró después a `@noble/secp256k1` vendorizado.
- El wrapper expone:
  - `generatePrivateKey()` → hex 32 bytes
  - `getPublicKey(privHex, {compressed})` → hex en formato 04… para no comprimido
  - `sign(msgHashBytes, privHex)` → `{ r, s }` hex
  - `verify({r,s}, msgHashBytes, pubHex)` → booleano
- Conversión hex/bytes interna (`hexToBytes`, `bytesToHex`) para interoperar con noble y la UI.

### 3) Noble: forzar ruta asíncrona de firma

- Contexto: noble tiene dos rutas de firma: `sign` (sincrónica) y `signAsync` (asíncrona). La versión síncrona requiere `hashes.hmacSha256` definido, lo que no existe por defecto en navegador → error: `hashes.hmacSha256 not set`.
- Solución aplicada:
  - En el wrapper, se definió `noble.hashes.hmacSha256Async` usando WebCrypto HMAC (`crypto.subtle.importKey` + `subtle.sign`).
  - La función `sign` del wrapper llama explícitamente a `noble.signAsync(...)` con `{ prehash: false, lowS: true }` para forzar el camino asíncrono.
  - Resultado: Se elimina el error de DRBG HMAC y la firma funciona bajo CSP sin polyfills.

### 4) Uso correcto de `{r,s}` y digest bytes

- Se estandarizó la firma para que el wrapper devuelva `{ r, s }` en hex, y los consumidores (Sign & Verify / Send) usen directamente esos valores sin llamar `toString(16)` (que sería incorrecto sobre hex strings).
- Los flujos calculan el hash del payload/outputs a `Uint8Array` (bytes) y lo entregan a `sign/verify` con `prehash: false`, porque ya hemos pre-hasheado.

### 5) Limpieza de polyfills y CSP

- Al usar noble vendorizado + WebCrypto, se eliminaron referencias y archivos `public/node/crypto.mjs` y `public/node/buffer.mjs` que se habían introducido temporalmente para elliptic.
- Se verificó la carga de módulos ESM locales, sin `eval` ni importaciones remotas.

## Flujos funcionales

### Crear y descargar keystore

1. Usuario introduce passphrase y descarga un keystore JSON cifrado (AES-GCM). 
2. El keystore guarda `publicKey` (no comprimida, prefijo `04`…).

### Importar keystore y preparar wallet

1. Usuario selecciona el archivo y passphrase.
2. Se deriva la clave (p.ej. PBKDF2), se descifra la clave privada y se re-computa `publicKey`.
3. Se comprueba que `publicKey` derivada coincide con la del keystore (integridad).
4. Se actualiza la vista My Wallet: `senderPub`, balance, y UTXOs (con estado “Pendiente” si aplica).

### Firmar y verificar mensaje

1. “Firmar”: calcula `sha256Bytes(payload)` y llama `secp.sign(bytes, privHex)` → `{r,s}` hex.
2. “Verificar”: toma `pubHex`, `{r,s}` y `sha256Bytes(payload)` y llama `secp.verify(...)`.
3. La UI muestra el resultado (válido/inválido) y no produce errores de CSP.

### Enviar transacción (UTXO)

1. Usuario selecciona UTXOs suficientes para cubrir `amount`.
2. Construcción de `inputs` y `outputs` (se añade change si corresponde).
3. Se firma el `SHA-256(JSON(outputs))` con `secp.sign(... )`.
4. Se adjunta `{r,s}` a cada `input` como `signature`.
5. Se calcula `txId` como `SHA-256(SHA-256(JSON({inputs, outputs})))`, en hex.
6. Se envía `POST /transaction` con `{ signedTransaction, passphrase }`.

## Errores típicos y su resolución

- `hashes.hmacSha256 not set` en consola:
  - Causa: noble ruta síncrona de firma activa.
  - Solución: forzar `signAsync` en el wrapper y definir `hashes.hmacSha256Async` con WebCrypto.

- Firmas inválidas al verificar:
  - Causa común: digest incorrecto (prehash doble) o `{r,s}` mal construido.
  - Solución: asegurar que el digest se calcula una sola vez y que `{r,s}` son hex de 32 bytes.

## Notas de seguridad

- CSP estricta: todas las dependencias son locales; sin CDN.
- WebCrypto para hashing y HMAC: evita dependencias de terceros y mejora seguridad.
- `lowS: true` en firma: reduce ataques de malleability.
- Keystore con AES-GCM y derivación de clave (p.ej., PBKDF2): mantener passphrase fuerte.

## Próximas mejoras (opcional)

- Minimizar footprint de noble vendorizado (import selectivo si se separa en módulos).
- Añadir tests E2E para Sign/Verify y Send.
- Medir latencia de WebCrypto en distintos navegadores.

## Referencias internas

- HTML: `public/demo-wallet/web-demo.html`
- SPA lógica: `public/demo-wallet/web-demo.js`
- Navegación y eventos: `public/demo-wallet/web-demo-inline.js`
- Wrapper curva: `public/demo-wallet/vendor/secp256k1.mjs`
- Librería vendorizada: `public/demo-wallet/vendor/secp256k1-lib/index.js`

## Changelog resumido

- Sustitución SHA-256 CDN → WebCrypto helper.
- Creación wrapper `secp256k1.mjs` y migración a `@noble/secp256k1` vendorizado.
- Forzado `signAsync` y añadido `hashes.hmacSha256Async` (WebCrypto) para DRBG de noble.
- Corrección de `{r,s}` y uso de bytes digest en flujos.
- Limpieza de polyfills Node en frontend.
