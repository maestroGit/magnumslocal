# Implementación de generación e importación de keystore para BW-Wallet (WineLover)

## Resumen
Este documento describe el flujo de generación de un keystore seguro para una wallet tipo BW-Wallet, así como el proceso de importación y desencriptado en el frontend. Se detallan las librerías utilizadas, el formato del keystore y las consideraciones de seguridad.

---

## 1. Librerías utilizadas

- **noble-secp256k1** (v1.7.1, vía CDN):
  - Generación de claves privadas y públicas secp256k1.
  - Derivación de publicKey a partir de privateKey.
  - [Repositorio](https://github.com/paulmillr/noble-secp256k1)
- **WebCrypto API** (nativa en navegadores modernos):
  - Generación de entropía segura (crypto.getRandomValues).
  - Derivación de claves simétricas (PBKDF2/Scrypt).
  - Cifrado y descifrado AES-GCM.
- **scrypt-pbkdf2-shim** (shim para Scrypt):
  - Derivación de clave simétrica a partir de passphrase.

---

## 2. Generación del keystore

1. **Generación de clave privada**
   - Se usa WebCrypto para obtener 32 bytes aleatorios (Uint8Array).
   - Ejemplo:
     ```js
     const privBytes = new Uint8Array(32);
     crypto.getRandomValues(privBytes);
     ```
2. **Derivación de clave pública**
   - Se utiliza noble-secp256k1:
     ```js
     const pub = bufToHex(secp.getPublicKey(bufToHex(privBytes), true));
     ```
     - *Nota:* noble-secp256k1 v1.7.1 espera la privateKey como string hexadecimal.
3. **Derivación de clave simétrica**
   - Se deriva una clave simétrica a partir de la passphrase del usuario usando Scrypt (o PBKDF2).
   - Se genera un salt aleatorio para la derivación.
4. **Cifrado de la clave privada**
   - Se cifra la privateKey (en hex) usando AES-256-GCM con la clave derivada y un IV aleatorio.
   - El resultado es un ciphertext y un authentication tag.
5. **Estructura del keystore**
   - El keystore es un objeto JSON con la siguiente estructura:
     ```json
     {
       "keystoreVersion": 1,
       "id": "web-demo-<timestamp>",
       "createdAt": "<ISO date>",
       "createdBy": "web-demo",
       "kdf": "scrypt",
       "kdfParams": { "salt": "..." },
       "cipher": "aes-256-gcm",
       "cipherParams": { "iv": "..." },
       "publicKey": "...",
       "encryptedPrivateKey": "..."
     }
     ```
   - El archivo se descarga como .json.

---

## 3. Importación y desencriptado del keystore

1. **Carga y parseo**
   - El usuario selecciona el archivo .json y se parsea el contenido.
2. **Derivación de clave simétrica**
   - Se deriva la clave simétrica usando la passphrase y el salt almacenado en el keystore.
3. **Desencriptado de la clave privada**
   - Se usa AES-GCM con la clave derivada y el IV para descifrar el campo `encryptedPrivateKey`.
   - Si la passphrase es incorrecta o el archivo está corrupto, el descifrado falla.
4. **Validación**
   - Se deriva la publicKey a partir de la privateKey descifrada y se compara con la almacenada en el keystore para verificar integridad.

---

## 4. Consideraciones de seguridad
- La privateKey nunca se almacena en texto plano.
- El keystore solo puede ser descifrado con la passphrase correcta.
- Se recomienda usar passphrases robustas y únicas.
- El cifrado AES-GCM garantiza confidencialidad e integridad.

---

## 5. Referencias
- [noble-secp256k1](https://github.com/paulmillr/noble-secp256k1)
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)
- [Scrypt](https://en.wikipedia.org/wiki/Scrypt)

---

*Actualizado: 2025-12-14*
