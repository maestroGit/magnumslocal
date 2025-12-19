# WALLET-DEMO — Documentación técnica
[→ Ver nota sobre la migración de elliptic a noble-secp256k1](#nota-sobre-la-migración-de-librería-de-curva-elíptica)

** Contenido anterior **
Este documento recoge, de forma exhaustiva, el diseño, la implementación, las decisiones técnicas y las recomendaciones futuras relacionadas con la demo de wallet que hemos desarrollado en `wallet/test/web-demo.html` y `wallet/test/web-demo.js`.
Incluye el flujo de generación de claves, el formato de keystore, el KDF, el cifrado, la vendorización de `scrypt-js`, los fallbacks que implementamos, instrucciones de uso y propuestas para producción.

## Archivos relevantes

- `wallet/test/web-demo.html` — Interfaz ligera para el demo: crear wallet, descargar keystore, importar y firmar payloads.
- `wallet/test/web-demo.js` — Lógica del demo (generación de keypair, derivación de clave, cifrado AES-GCM, import, firma).
- `wallet/test/vendor/scrypt-js.mjs` — (histórico) wrapper local para scrypt-js (intento de normalizar bundles CDN).
- `wallet/test/vendor/scrypt-pbkdf2-shim.mjs` — shim PBKDF2 local (actual) usado por el demo para derivación estable en navegadores.
- `wallet/test/keys-web-demo.json` — ejemplo de keystore (descargado por el demo cuando se genera)
- `wallet/test/hardwareWallet.js` — script CLI original para generación y backup (implementación server/CLI que inspiró el demo).
- `docs/CLI-PACKAGING.md` — instrucciones para empaquetar `hardwareWallet.js` con `pkg`.

## Objetivos del demo

- Probar y mostrar el flujo completo de generar una wallet (secp256k1) en el navegador.
- Mantener la private key siempre en el cliente (nunca enviar la clave al servidor).
- Proveer un formato de keystore JSON compatible con el enfoque del CLI: metadata + kdf params + cipher params + ciphertext.
- Ser reproducible y fácil de ejecutar localmente (servir por HTTP y abrir en el navegador).

## Flujo de usuario (alto nivel)

1. El usuario abre `web-demo.html` (recomendado: servido por HTTP, p.ej. `npx serve .`).
2. Pulsa `Crear wallet` y proporciona una passphrase.
3. El demo genera un par de claves secp256k1 (biblioteca `elliptic` en el navegador), deriva una clave simétrica desde la passphrase (actualmente el demo usa un shim PBKDF2 local para estabilidad), cifra la `privateKey` con AES-256-GCM y ofrece para descarga un `keys-web-demo.json`.
4. Posteriormente el usuario puede `Importar keystore`, introducir la passphrase y el demo descifra la privateKey en memoria.
5. Con la key en memoria puede firmar un payload (por ejemplo "hello world"). La firma (r,s) se muestra en pantalla y puede enviarse al servidor para verificación.

## Formato de keystore (JSON)

Ejemplo producido por el demo:

{
  "keystoreVersion": 1,
  "id": "web-demo-163...",
  "createdAt": "2025-10-20Txx:xx:xxZ",
  "createdBy": "web-demo",
  "kdf": "scrypt",
  "kdfParams": { "salt": "...hex..." },
  "cipher": "aes-256-gcm",
  "cipherParams": { "iv": "...hex..." },
  "publicKey": "04...",
  "encryptedPrivateKey": "...hex..."
}

- `keystoreVersion` — número de versión del esquema.
- `kdf` / `kdfParams` — especifica cómo derivar la clave simétrica (salt y parámetros).
- `cipher` / `cipherParams` — técnica de cifrado y parámetros (iv, tag si aplica; en la demo usamos `cipherParams.iv` para almacenar el IV y el tag se concatena en el ciphertext en el demo por simplicidad del entorno, aunque el CLI almacena el tag separado).

> Nota: El CLI `hardwareWallet.js` usa AES-GCM y guarda tag por separado en `cipherParams.tag`; la demo mantiene compatibilidad funcional y puede adaptarse para separar/concatenar según convenga.

## Implementación — piezas clave

### 1) Generación de claves
- Biblioteca: `elliptic` (secp256k1). Se genera `keyPair` con `ec.genKeyPair()` y se extraen `publicKey` (hex) y `privateKey` (hex).

### 2) Derivación de clave (KDF)
- Preferencia: `scrypt` (resistente a ataques acelerados y con consumo de memoria).
- Implementación demo (resumen):
  - Inicialmente intentamos usar `scrypt-js` importado vía ESM/CDN. Diferencias entre bundles ESM/CDN causaron inconsistencias (export shapes distintos) en varios navegadores.
  - Se creó un wrapper para normalizar exports (`wallet/test/vendor/scrypt-js.mjs`) y, cuando eso falló en ciertos entornos, el demo añadió un fallback PBKDF2.
  - Para eliminar la dependencia a CDNs y estabilizar el demo, se añadió un shim local `wallet/test/vendor/scrypt-pbkdf2-shim.mjs` que implementa la API callback-style esperada y usa WebCrypto PBKDF2 internamente.
  - Nota: el shim PBKDF2 es una solución segura para demo/local, pero para producción recomendamos vendorizar `scrypt-js` o integrar `argon2-wasm`.

Parámetros empleados (demo): N=16384, r=8, p=1, dkLen=32.

Razonamiento: estos valores son razonables para un demo; para producción ajustar según la capacidad de CPU/memoria y la política de seguridad.

### 3) Cifrado (AES-GCM)
- Se usa Web Crypto Subtle API con `AES-GCM` y un IV de 12 bytes.
- La clave simétrica derivada (32 bytes) se importa como `raw` y se usa para `encrypt`/`decrypt`.
- Validaciones: WebCrypto requiere claves de 128 o 256 bits (16 o 32 bytes). La demo valida esto y arroja errors claros si no se cumple.

### 4) Firma
- Se usa `elliptic` para firmar. La demo firma actualmente los bytes crudos del payload (UTF-8); recomendamos firmar el hash (SHA-256(payload)) en producción.
- La salida se presenta como `{ r: <hex>, s: <hex> }`. También podemos presentar DER o compact/base64 si el backend lo requiere.

## Por qué hubo problemas con scrypt desde CDN y qué hicimos

- Problema: al importar `scrypt-js` desde algunos CDNs ESM (p.ej. esm.sh o jsDelivr) el paquete puede exportar la función en diferentes formas (default export, named export, o con envoltorios), lo que provocó errores donde `scrypt` no era invocable directamente o devolvía un resultado con forma inesperada.
- Acciones tomadas:
  - Se implementó un wrapper para intentar normalizar exports y adaptar distintos shape/contractos.
  - Se implementó un fallback en tiempo de ejecución a PBKDF2 para mantener la demo funcional.
  - Finalmente, para estabilidad, el demo fue actualizado para usar `wallet/test/vendor/scrypt-pbkdf2-shim.mjs` (shim PBKDF2 local). Esto elimina la dependencia al CDN y evita discrepancias de bundling entre navegadores.

## Vendorizar completamente (recomendación)

Para evitar depender de CDNs externos (y para garantizar consistencia), lo recomendable es vendorizar la librería completa en el repo:

1. Descargar el paquete `scrypt-js` (fuente) y colocar los ficheros ESM/minificados en `wallet/test/vendor/`.
2. Ajustar `wallet/test/vendor/scrypt-js.mjs` para exportar directamente la función vendorizada sin importar desde una URL externa.
3. Probar en un entorno offline (servir localmente) y verificar que `deriveKey` devuelve un `Uint8Array` de 32 bytes.

Yo añadí un wrapper que apunta a esm.sh para facilitar pruebas; si quieres lo reemplazo ahora por una copia completa del paquete (lo vendorizo totalmente) y lo comiteo al repo.

## Seguridad — notas y recomendaciones

- Nunca enviar la privateKey ni el keystore sin cifrar al servidor.
- Usar scrypt o argon2 para producción; PBKDF2 solo como fallback de demo.
- Ajustar parámetros KDF según el perfil de clientes (desktop vs mobile): N más alto en ordenadores, menor en móviles.
- Limpiar en memoria la privateKey después de usarla (setear variables a `null`) para reducir el riesgo de fugas en sesiones largas.
- Para distribución de herramientas CLI, proveer checksums/firmas del binario y publicar el código fuente para auditoría.

## Interoperabilidad y verificación de firma

La demo emite r y s en hex. Para verificar la firma en el servidor (Node + elliptic):

```javascript
import elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

const payload = 'hello world';
const payloadBytes = Buffer.from(payload, 'utf8');
const pub = ec.keyFromPublic(pubKeyHex, 'hex');
const ok = pub.verify(payloadBytes, { r: signature.r, s: signature.s });
```

Recomendación: usar `SHA-256(payload)` y firmar/verificar el hash para evitar inconsistencias entre implementaciones.

## Cómo ejecutar y probar

Recomendado: servir el repo con un servidor estático y abrir `web-demo.html`:

```bash
npx serve . -l 8080
# abrir en navegador:
# http://localhost:8080/wallet/test/web-demo.html
```

Pruebas rápidas:

- Crear wallet → descargar `keys-web-demo.json`.
- Importar usando la misma passphrase → verificar publicKey mostrada.
- Poner payload (por ejemplo `hello world`) y pulsar Firmar → copiar firma y verificar con `elliptic` en Node.

## Registro de errores comunes y soluciones

- `Failed to load resource` (404) para `elliptic.mjs`/`scrypt`:
  - Sirve por HTTP (no `file://`) y usa el vendor local para scrypt; en el demo ya cambiamos la import a `./vendor/scrypt-js.mjs`.
- `scrypt is not a function`:
  - Ocurre cuando el paquete exporta un objeto distinto; el wrapper local y la lógica de normalización mitigaron esto.
- `AES key data must be 128 or 256 bits`:
  - Ocurre si la KDF no devuelve 16/32 bytes; la demo valida y hace fallback a PBKDF2 si scrypt devuelve una forma inesperada.

## Propuestas y próximos pasos (priorizados)

1. Vendorizar completamente `scrypt-js` (hacerlo offline) — tarea de baja complejidad y alto valor para reproducibilidad. (Puedo hacerlo ahora.)
2. Integrar `argon2-wasm` para KDF (argon2id) en la demo/producción — mayor seguridad, costo en bundle size.
3. Cambiar la demo para firmar `SHA-256(payload)` y exportar firma en formatos DER y compact/base64 para interoperabilidad.
4. Añadir tests automáticos (Jest) que:
   - Generen par de claves, cifren con passphrase y descifren (happy path).
   - Intenten descifrar con passphrase incorrecta y comprueben fallo.
5. Auditar y mitigar vulnerabilidades en dependencias (ver `npm audit` / Dependabot`).

## Archivo: commits y cambios realizados

- `wallet/test/web-demo.html` — nueva interfaz demo.
- `wallet/test/web-demo.js` — demo logic: keygen, scrypt usage + normalization, AES-GCM encrypt/decrypt, PBKDF2 fallback, sign.
- `wallet/test/vendor/scrypt-js.mjs` — (histórico) wrapper local para scrypt.
- `wallet/test/vendor/scrypt-pbkdf2-shim.mjs` — shim PBKDF2 local usado por el demo.
- `docs/CLI-PACKAGING.md` — instrucciones de packaging para el CLI.

Si quieres, hago ahora la vendorización completa (copiar el paquete `scrypt-js` dentro de `wallet/test/vendor/` y actualizar el wrapper para no importar nada remoto). También puedo implementar `argon2-wasm` si prefieres máxima seguridad en la demo.

---
Documentado por la implementación del demo y su evolución. Si quieres que transforme este documento a un formato más corto (resumen para README) o que lo añada a la página de documentación del repo, lo hago.




¿Qué significa "vendorizar"?

Vendorizar (vendoring) = copiar una dependencia externa dentro del propio repositorio y usar esa copia en lugar de cargarla desde npm o desde un CDN.
Es decir: en vez de hacer import 'scrypt-js' que resuelve desde node_modules o un CDN, guardas los ficheros JS/WASM de scrypt-js en tu repo (p. ej. wallet/test/vendor/scrypt-js/) y tu código importa desde ./vendor/scrypt-js/....
¿Por qué se hace?

Ventajas
Reproducibilidad: siempre tienes la misma versión del código (sin depender de un CDN ni de cambios upstream).
Disponibilidad offline: funciona aunque el CDN caiga.
Control: puedes parchear o adaptar el código si hace falta (y versionarlo).
Inconvenientes
Aumenta el tamaño del repositorio.
Debes ocuparte de actualizaciones y de la licencia (incluir LICENSE/atribuciones).
Si hay binarios/WASM grandes, puede ser mejor usar Git LFS.
¿Cuándo vendorizar y cuándo no?

Vendorizar si necesitas máxima estabilidad y el paquete es pequeño o crítico (demo offline, bundles ESM inconsistentes).
No vendorizar si la dependencia se actualiza frecuentemente o el paquete es grande y puedes confiar en npm/CDN (o si usar submódulos/subtree es preferible).
Qué incluye una vendorización responsable

Copiar solo los ficheros necesarios (dist ESM/minified + licencia).
Añadir wallet/test/vendor/scrypt-js/README.md con versión upstream, URL y checksum.
Incluir la LICENSE del autor en la carpeta vendor.
No borrar ni ocultar referencias de licencia.
Si hay archivos grandes: usar Git LFS o dejarlos fuera y documentar la razón.

Qué sigue

Si quieres que el demo use de nuevo scrypt-js real (vendorizado), puedo vendorizar la versión que prefieras (p. ej. 3.0.1), incluir LICENSE/README y actualizar imports para usar la copia local. Eso hará el demo más representativo de producción, pero requerirá verificar el bundle y, posiblemente, ajustar exports.
Alternativamente, puedo cambiar la demo para integrar argon2-wasm (más seguro en cliente) si priorizas seguridad sobre tamaño y complejidad.
¿Quieres que vendorice scrypt-js@3.0.1 ahora o prefieres mantener el shim PBKDF2?

## Nota sobre la migración de librería de curva elíptica

> **Decisión técnica relevante:**
> A partir de 2025, la generación y manejo de claves secp256k1 en la demo migró de la librería `elliptic` a `noble-secp256k1`.
>
> - **Motivo:** `noble-secp256k1` es más segura, ligera, moderna y fácil de auditar. Está activamente mantenida y es recomendada para nuevos desarrollos, mientras que `elliptic` está en modo mantenimiento y tiene más dependencias.
> - **Implicación:** El fondo matemático (secp256k1) es el mismo, pero la implementación y la API son más robustas y seguras en `noble-secp256k1`.
> - **Compatibilidad:** El formato de keystore y el flujo de cifrado/descifrado no cambian, pero la derivación de claves y la interoperabilidad mejoran.

Esto alinea la demo con las mejores prácticas actuales de seguridad y desarrollo frontend.

