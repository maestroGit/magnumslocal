# WALLET-COLD — Resumen y propuestas

Este documento resume el comportamiento actual del script `wallet/test/hardwareWallet.js` y propone mejoras concretas para su uso como herramienta de respaldo/cold-wallet.

## Resumen del script actual

- Propósito: generar un par de claves (secp256k1), guardar la clave pública y la clave privada (cifrada) en un archivo JSON, y luego reconstruir un `keyPair` funcional a partir del backup para firmar transacciones.
- Algoritmos usados:
  - curva: secp256k1 (biblioteca `elliptic`).
  - KDF: `scrypt` (Node `crypto.scryptSync`) — se deriva una clave XOR de 32 bytes.
  - Cifrado: AES-256-GCM (Node `crypto.createCipheriv` / `createDecipheriv`) con IV de 12 bytes y tag de autenticación (16 bytes).
- Formato de salida (JSON):
  - `publicKey` — hex
  - `encryptedPrivateKey` — hex (ciphertext)
  - `salt` — hex (para scrypt)
  - `iv` — hex (para AES-GCM)
  - `tag` — hex (auth tag)
  - `kdf` — "scrypt"
  - `cipher` — "aes-256-gcm"

- Flujo:
  1. Se genera una wallet nueva con balance inicial (demo).
  2. El script toma `KEY_PASSPHRASE` (env) o solicita interactivamente una passphrase (entrada oculta y confirmación).
  3. Intenta guardar en `KEY_FILE_PATH` (env) o en la ruta por defecto `D:\\keys.json`. Si falla (por ejemplo el drive D: no existe), guarda en `./keys.json` (fallback local).
  4. Luego intenta restaurar la wallet desde el mismo archivo usando la passphrase.

## Uso (ejemplos)

- Interactivo (se solicitará passphrase):

```bash
node wallet/test/hardwareWallet.js
```

- No interactivo (passphrase por entorno):

```bash
export KEY_PASSPHRASE='mi-frase-secreta'
export KEY_FILE_PATH='D:/keys.json' # opcional
node wallet/test/hardwareWallet.js
```

> Nota: No recomendamos pasar la passphrase en la línea de comandos por historial y exposición.

## Notas de seguridad y consideraciones

- La passphrase es crítica: si se pierde, la clave privada no puede recuperarse.
- Evitar exponer la passphrase en el historial del shell. Preferir variable de entorno temporal o entrada interactiva.
- `scryptSync` se usa por simplicidad; es bloqueante. Para aplicaciones UI/servicio, usar `scrypt` (async) o derivación fuera del hilo principal.
- El archivo JSON contiene la clave pública en claro y todos los metadatos para descifrar la privateKey — quien tenga el archivo y la passphrase puede recuperar la clave privada.
- Para máxima seguridad, considerar respaldos en hardware (HSM, yubikey) o formatos estandarizados (BIP39 mnemonics, Ethereum keystore v3).

## Propuestas de mejora (priorizadas)

1. --out / -o CLI flag (rápido)
   - Añadir parsing de `process.argv` para permitir `--out /ruta/archivo.json` y `-o` corto.
   - Prioridad de rutas: flag > `KEY_FILE_PATH` env > por defecto > fallback local.
   - Implementación mínima: parseo manual o `minimist` si se quiere dependencia.

2. Usar `crypto.scrypt` (async) en lugar de `scryptSync`
   - Evita bloquear el event-loop en operaciones pesadas.
   - Recomendado para integraciones GUI o CLI largas.

3. Añadir prompt de passphrase más robusto
   - Mejor manejo de errores en la confirmación y reintentos.
   - Soportar `--no-interaction` para scripts/CI (en ese caso forzar env var o error).

4. Permitir exportar un formato de keystore estándar
   - Considerar compatibilidad con Ethereum keystore v3 o BIP-39 mnemonic export.
   - Añadir versión y metadata (timestamp, tool version) al JSON.
      - Implementado: `keystoreVersion`, `id` (uuid v1), `createdAt`, `createdBy` (package.json version), `kdfParams` y `cipherParams`.

5. Tests automáticos
   - Añadir test corto que:
     - Genere par de claves, cifre con passphrase, descifre y valide que la privateKey resulta igual.
     - Test con passphrase incorrecta (debe fallar con auth error).

# WALLET-COLD — Resumen y propuestas

Este documento resume el comportamiento actual del script `wallet/test/hardwareWallet.js`, detalla las mejoras recientes y propone próximos pasos.

## Resumen del script actual

- Propósito: generar un par de claves (secp256k1), guardar la clave pública y la clave privada (cifrada) en un archivo JSON, y luego reconstruir un `keyPair` funcional a partir del backup para firmar transacciones.
- Algoritmos usados:
  - curva: secp256k1 (biblioteca `elliptic`).
  - KDF: `scrypt` (Node `crypto.scrypt`, implementado en forma async) — se deriva una clave de 32 bytes.
  - Cifrado: AES-256-GCM (Node `crypto.createCipheriv` / `createDecipheriv`) con IV de 12 bytes y tag de autenticación (16 bytes).

- Formato de salida (JSON):
  - `keystoreVersion` — number (esquema del keystore, p.ej. 1)
  - `id` — uuid (v1)
  - `createdAt` — timestamp ISO 8601
  - `createdBy` — herramienta/versión (p.ej. "magnumsmaster v1.0.0")
  - `kdf` — "scrypt" y `kdfParams` (incluye `salt` en hex)
  - `cipher` — "aes-256-gcm" y `cipherParams` (incluye `iv` y `tag` en hex)
  - `publicKey` — hex
  - `encryptedPrivateKey` — hex (ciphertext)

- Flujo:
  1. Se genera una wallet nueva con balance inicial (demo).
  2. El script toma `KEY_PASSPHRASE` (env) o solicita interactivamente una passphrase (entrada oculta y confirmación).
  3. La ruta de salida puede especificarse con la flag `--out`/`-o` (prioridad) o con `KEY_FILE_PATH` env; por defecto intenta `D:\\keys.json` y, si no es posible, hace fallback a `./keys.json`.
  4. Luego intenta restaurar la wallet desde el mismo archivo usando la passphrase.

## Uso (ejemplos)

- Interactivo (se solicitará passphrase):

```bash
node wallet/test/hardwareWallet.js
```

- No interactivo (passphrase por entorno):

```bash
export KEY_PASSPHRASE='mi-frase-secreta'
export KEY_FILE_PATH='D:/keys.json' # opcional
node wallet/test/hardwareWallet.js
```

- Especificar salida con flag:

```bash
node wallet/test/hardwareWallet.js --out 'D:\\keys.json'
```

> Nota: No recomendamos pasar la passphrase en la línea de comandos por historial y exposición. Preferir entrada interactiva o variable de entorno temporal.

## Seguridad y consideraciones

- La passphrase es crítica: si se pierde, la clave privada no puede recuperarse.
- `scrypt` es costoso por diseño; los parámetros (N, r, p) deben ajustarse según el entorno. El script usa valores razonables por defecto.
- Usar `scrypt` async evita bloquear el event-loop; esto es importante si el código se integra en servicios o UIs.
- AES-GCM proporciona autenticidad e integridad del ciphertext. Si necesitas proteger metadatos adicionales, considera firmar/HMACear el objeto completo.
- Para máxima seguridad, considerar respaldos en hardware (HSM, YubiKey) o formatos estandarizados (BIP39, Ethereum keystore v3).

## Cambios implementados

- Migrado a `crypto.scrypt` (async) y uso de `await` para no bloquear el loop.
- Añadida flag `--out` / `-o` para especificar la ruta de salida (prioridad sobre `KEY_FILE_PATH`).
- Guardado en JSON con metadata: `keystoreVersion`, `id` (uuid v1), `createdAt`, `createdBy` (usa `package.json` version), `kdfParams`, `cipherParams`.
- Manejo de fallback de ruta (si `D:\\keys.json` no existe se guarda en `./keys.json`).
- Mensajes de error más claros (especialmente en caso de passphrase incorrecta o fichero corrupto).

## Propuestas de mejora (priorizadas)

1. Tests automáticos (alta prioridad)
   - Tests unitarios para: cifrado/descifrado correcto, passphrase incorrecta (debe fallar), y compatibilidad con formatos antiguos.

2. `--help` y validación de flags
   - Añadir ayuda `--help` y validar rutas/permiso de escritura antes de proceder.

3. Parámetros KDF configurables
   - Exponer N/r/p (o equivalentes) vía flags/variables para ajustar seguridad/CPU.

4. Keystore estándar (opcional)
   - Soportar/convertir a formato Ethereum keystore v3 o incluir opción de exportar BIP39 mnemonic.

5. Serialización/limitación de derivaciones concurrentes
   - Si la herramienta se integra en un servicio, controlar concurrencia o aumentar `UV_THREADPOOL_SIZE`.

## Ejemplo de `keys.json` esperado

```json
{
  "keystoreVersion": 1,
  "id": "<uuid-v1>",
  "createdAt": "2025-10-20T14:12:00Z",
  "createdBy": "magnumsmaster v1.0.0",
  "kdf": "scrypt",
  "kdfParams": { "salt": "08dac3ddea0aa574576af720a3f00338" },
  "cipher": "aes-256-gcm",
  "cipherParams": { "iv": "a420030b7f7b0ced39ea6586", "tag": "4c4170fb746bfe2692c6634208a0e9bc" },
  "publicKey": "04cb3c85...",
  "encryptedPrivateKey": "78128ffcf3ae84..."
}
```

---

Si quieres, puedo:
- añadir tests básicos ahora;
- añadir `--help` y validación de ruta antes de guardar;
- commitear los cambios y hacer push al branch actual.

¿Cuál prefieres que haga a continuación?