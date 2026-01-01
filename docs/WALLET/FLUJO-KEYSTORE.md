# Flujo de generación, cifrado y validación de claves (keystore)

## 1. Generación de Keystore en el Frontend
- El usuario ingresa una passphrase.
- Se deriva una clave simétrica usando scrypt (con salt, N, r, p, keylen).
    Explicación sencilla de: salt, N, r, p, keylen:
    salt: Es un valor aleatorio (en hex) que se añade a la passphrase antes de derivar la clave. Sirve para que, aunque dos usuarios usen la misma passphrase, la clave resultante sea diferente y más segura.
    N: Es el “coste” computacional de scrypt. Cuanto mayor es N, más difícil (lento) es calcular la clave, lo que protege contra ataques de fuerza bruta.
    r: Controla el uso de memoria de scrypt. Es un parámetro técnico que, junto con N, ajusta la dificultad del cálculo.
    p: Es el número de procesos paralelos que scrypt usa internamente. Aumentarlo también hace el cálculo más costoso.
    keylen: Es la longitud (en bytes) de la clave derivada. Para AES-256, debe ser 32 bytes (256 bits).
    Resumen:
    Estos parámetros juntos hacen que la clave derivada de la passphrase sea única, segura y resistente a ataques, incluso si la passphrase es débil. Así, el keystore solo puede descifrarse con la passphrase correcta y los mismos parámetros.
- Se genera un par de claves (privada y pública) con secp256k1.
- La clave privada se convierte a bytes puros y se cifra con AES-256-GCM usando la clave derivada y un IV aleatorio.
- El keystore generado contiene:
  - `publicKey`: clave pública en hex.
  - `encryptedPrivateKey`: clave privada cifrada en hex.
  - `kdfParams`: parámetros de scrypt (salt, N, r, p, keylen).
  - `cipherParams`: IV usado en AES-GCM.

## 2. Firma de transacciones en el Frontend
- El usuario importa el keystore y lo descifra con la passphrase.
- Se deriva la clave simétrica con los mismos parámetros y salt.
- Se descifra la clave privada con AES-256-GCM.
- Se deriva la clave pública y se compara con la del keystore para asegurar coincidencia.
- Se seleccionan los UTXOs correspondientes a la clave pública.
- Se firma la transacción con la clave privada descifrada.
- Se envía la transacción pre-firmada al backend.

## 3. Validación en el Backend
- El backend recibe la transacción pre-firmada.
- Verifica que la clave pública del input coincida con la del keystore.
- Verifica la firma usando la clave pública y el hash de la transacción.
- Si la firma es válida, la transacción se acepta y propaga.
- Si la firma es inválida o la clave pública no coincide, se rechaza.

## 4. Seguridad y compatibilidad
- El passphrase nunca viaja al backend.
- El keystore es compatible entre frontend y backend si:
  - El passphrase se convierte a bytes (UTF-8) antes de scrypt en ambos lados.
  - Los parámetros de scrypt y AES-GCM son idénticos.
  - La clave privada se cifra/descifra como bytes puros.
- Los logs detallan cada paso para depuración y trazabilidad.

---

**Resumen:**
El flujo garantiza que solo el usuario con el keystore y passphrase correctos puede firmar UTXOs de su address. El backend solo valida y propaga transacciones pre-firmadas, reforzando la seguridad y la separación de roles.