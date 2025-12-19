# Diferencias entre generación de claves en frontend y backend

## Frontend
- **Librerías típicas:**
  - `crypto-js`, `scrypt-js`, `elliptic`, `webcrypto` (navegador).
- **Proceso:**
  1. El usuario ingresa una passphrase.
  2. Se deriva una clave con scrypt usando salt.
  3. Se genera un par de claves (privada y pública) con `elliptic`.
  4. La clave privada se cifra con AES-GCM usando la clave derivada y un IV aleatorio.
  5. Se guarda el keystore con:
     - `publicKey`
     - `encryptedPrivateKey`
     - `kdfParams` (salt, N, r, p, dkLen)
     - `cipherParams` (iv)
     - `authTag` (de AES-GCM)

## Backend
- **Librerías típicas:**
  - `crypto` (nativo Node.js), `elliptic`, `fs`.
- **Proceso:**
  1. Recibe el keystore y la passphrase.
  2. Deriva la clave con `crypto.scrypt` usando los mismos parámetros.
  3. Descifra la clave privada con AES-256-GCM usando la clave derivada, IV y authTag.
  4. Reconstruye el par de claves con `elliptic` usando la clave privada descifrada.
  5. Usa la clave privada para firmar transacciones.

---

## Items generados en el proceso
- `publicKey`: Clave pública en formato hex.
- `encryptedPrivateKey`: Clave privada cifrada en hex.
- `kdfParams`: Parámetros de derivación (salt, N, r, p, dkLen).
- `cipherParams`: Parámetros de cifrado (iv).
- `authTag`: Tag de autenticación de AES-GCM.

---

## Flujo seguro y funcional en el backend
- El backend recibe la passphrase en `/transaction`.
- Descifra la clave privada del keystore global con `decryptPrivateKeyFromKeystore`.
- Si la passphrase es incorrecta, responde con error claro.
- Si es correcta, inicializa la wallet y firma la transacción.
- Los logs detallan cada paso del descifrado y la recepción de la passphrase para depuración.

---

## Adaptación del proceso de minado (`/mine`)
- El objeto `miner` ahora se actualiza cada vez que la wallet global se carga o se descifra.
- Antes de minar, el backend asegura que `miner` use la wallet global actualizada, evitando errores de clave pública indefinida.
- Esto garantiza que los bloques se firman siempre con la clave privada correcta y que el flujo de minado es seguro y trazable.
- Los logs muestran el estado de la wallet y del objeto `miner` antes de cada minado para facilitar la depuración.

Sí, tu análisis es correcto. El hecho de que las wallets del frontend y backend usen diferentes librerías y formatos, y que el backend requiera una passphrase específica para descifrar el keystore, añade una capa de robustez y aislamiento entre ambos entornos.

Esto implica:

Aislamiento de claves: Cada entorno (frontend y backend) gestiona sus claves y keystores de forma independiente. Un usuario del frontend no puede acceder ni firmar con la clave privada del backend, y viceversa.
Seguridad adicional: Si la passphrase es incorrecta, el backend rechaza el acceso y no expone la clave privada. Esto protege contra intentos de acceso no autorizado.
Control de acceso: La bodega (backend) y los usuarios (frontend) tienen roles y permisos separados, lo que reduce el riesgo de manipulación o robo de fondos entre entornos.
Auditoría y trazabilidad: Los logs y el flujo de descifrado permiten auditar cada intento de acceso y detectar posibles ataques o errores.
En resumen, aunque la compatibilidad puede ser más compleja, este diseño refuerza la seguridad y la separación de responsabilidades entre backend y frontend, lo que es positivo para la protección de los activos y la privacidad de los usuarios.