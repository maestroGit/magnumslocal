En el frontend (web-demo.html), la lógica ya está adaptada para descifrar la encryptedPrivateKey usando la passphrase, y así operar con la clave privada en memoria.

En el backend, si solo tienes el campo encryptedPrivateKey y no la privateKey en texto plano, necesitas implementar la lógica para descifrar la clave privada usando la passphrase antes de firmar transacciones.
Actualmente, el backend no puede firmar si no tiene la clave privada descifrada.

Resumen:

El frontend ya descifra y usa la clave privada correctamente.
El backend requiere adaptación para trabajar con keystores cifrados y passphrase, igual que el frontend.
Si quieres que el backend firme usando la passphrase, hay que implementar esa lógica. ¿Te ayudo a adaptar el backend para esto?

No hay lógica de descifrado de claves privadas (AES, scrypt, PBKDF2, etc.) implementada en el backend actualmente.
Para que el backend pueda descifrar y usar la clave privada correctamente (como el frontend), necesitas:

Agregar una librería de cifrado compatible con Node.js (por ejemplo, crypto nativo, o paquetes como scrypt-js y crypto-js).
Implementar la función de descifrado que use la passphrase, el salt y el IV del keystore para obtener la clave privada en texto plano.
Modificar la carga de la wallet para pedir la passphrase y descifrar la clave antes de firmar.
¿Quieres que te genere el código base para descifrar la clave privada en el backend usando la estructura de tu keystore?

El frontend y el backend están en el mismo repositorio, pero el frontend usa APIs WebCrypto y librerías ESM que no son directamente reutilizables en Node.js backend.
Para el backend, necesitas usar librerías compatibles con Node.js (como el módulo crypto nativo o paquetes npm como scrypt-js y crypto-js).
La lógica (estructura del keystore, parámetros de cifrado) sí se puede reutilizar, pero el código debe adaptarse a Node.js.

# Descifrar la clave privada de un keystore BW-Wallet en Node.js

Este ejemplo te permite descifrar la clave privada de un archivo keystore generado por el frontend (web-demo) usando scrypt y AES-GCM en Node.js.

## Requisitos
- Instala las dependencias:
  ```bash
  npm install scrypt-js crypto
  ```

(El módulo crypto ya viene con Node.js.)

Crea una función en el backend para descifrar la clave privada desde el keystore y la passphrase.

Usa esa función decryptPrivateKeyFromKeystore(keystore, passphrase) antes de crear/firmar una transacción. Está integrarla en server.js
## Ejemplo de código
```js
const fs = require('fs');
const crypto = require('crypto');
const scrypt = require('scrypt-js');

// Lee el keystore
const keystore = JSON.parse(fs.readFileSync('app/uploads/wallet_default.json', 'utf8'));
const passphrase = 'TU_PASSPHRASE'; // Cambia por la passphrase real

const salt = Buffer.from(keystore.kdfParams.salt, 'hex');
const iv = Buffer.from(keystore.cipherParams.iv, 'hex');
const ciphertext = Buffer.from(keystore.encryptedPrivateKey, 'hex');

// Deriva la clave con scrypt
scrypt.scrypt(Buffer.from(passphrase), salt, 16384, 8, 1, 32, (error, progress, key) => {
  if (error) throw error;
  if (!key) return; // Espera a que termine
  const aesKey = Buffer.from(key);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    // Si usaste autenticación, añade decipher.setAuthTag(tag)
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    console.log('Clave privada descifrada:', decrypted.toString('utf8'));
  } catch (err) {
    console.error('Error al descifrar:', err.message);
  }
});
```

## Función reutilizable para Node.js

```js
const crypto = require('crypto');
const scrypt = require('scrypt-js');

async function decryptPrivateKeyFromKeystore(keystore, passphrase) {
  const salt = Buffer.from(keystore.kdfParams.salt, 'hex');
  const iv = Buffer.from(keystore.cipherParams.iv, 'hex');
  const ciphertext = Buffer.from(keystore.encryptedPrivateKey, 'hex');

  // Deriva la clave con scrypt (promesa)
  const key = await new Promise((resolve, reject) => {
    scrypt.scrypt(Buffer.from(passphrase), salt, 16384, 8, 1, 32, (error, progress, derivedKey) => {
      if (error) return reject(error);
      if (derivedKey) resolve(Buffer.from(derivedKey));
    });
  });

  // Descifra con AES-GCM
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    // Si tienes authTag, añade: decipher.setAuthTag(Buffer.from(keystore.cipherParams.authTag, 'hex'));
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Error al descifrar la clave privada: ' + err.message);
  }
}
```

## Ejemplo de integración en el backend

```js
const fs = require('fs');
const keystore = JSON.parse(fs.readFileSync('app/uploads/wallet_default.json', 'utf8'));
const passphrase = 'TU_PASSPHRASE';

(async () => {
  try {
    const privateKey = await decryptPrivateKeyFromKeystore(keystore, passphrase);
    console.log('Clave privada descifrada:', privateKey);
    // Aquí puedes crear la wallet y firmar transacciones
  } catch (err) {
    console.error(err.message);
  }
})();
```

## Notas
- El parámetro `authTag` solo es necesario si el frontend lo incluye en el keystore.
- Ajusta la ruta y la passphrase según tu caso.
- Puedes adaptar esta lógica para integrarla en el backend y firmar transacciones.

---
**Referencia:** La estructura del keystore debe coincidir con la generada por el frontend web-demo.

FLUJO:
🔑 Wallet cargada desde archivo C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json
🔗 Sin peers configurados - Ejecutándose como nodo Genesis
Listening for peer-to-peer connections on: 5001
Server HTTP is running on port 3000
Consulta UTXO para: 04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d En el backend:
🔑 Wallet cargada desde archivo C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json
🔗 Sin peers configurados - Ejecutándose como nodo Genesis
Listening for peer-to-peer connections on: 5001
Server HTTP is running on port 3000
Consulta UTXO para: 04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d Entoces relleno los campos: Nueva Transacción (Coin Control)
Destinatario (Clave Pública):
Introduce la clave pública del destinatario
Cantidad:
0.00
window.walletAddress = data.publicKey; showToast("Wallet cargada. Dirección actualizada.", "success");

5000 (init-fund-1... #0)
Enviar Transacción y al clicar ese botón: <button type="submit">Enviar Transacción</button> Se inicia la Confirmar Transacción
¿Estás seguro de que deseas enviar 5 a:
0471ca059b715123afaf242935526cca823b8d3e64e3895a9b802df167e5875dbcc1151be36219e9fe18da04868f9b8845b8e185dd7ab5f46a3648b7ecbc2f4708 usando 1 UTXOs?

Confirmar Cancelar Si el usuario click en <button id="confirmBtn" style="margin-right: 10px;">Confirmar</button> Es cuando hace el check y el backend: ❌ Transacción rechazada: wallet sin clave privada {
address: '04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d'
} la recha. Una vez explicado el flujo, donde crees que sería mejor incluir el descifrado para firmar?🔑 Wallet cargada desde archivo C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json
🔗 Sin peers configurados - Ejecutándose como nodo Genesis
Listening for peer-to-peer connections on: 5001
Server HTTP is running on port 3000
Consulta UTXO para: 04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d En el backend:
🔑 Wallet cargada desde archivo C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json
🔗 Sin peers configurados - Ejecutándose como nodo Genesis
Listening for peer-to-peer connections on: 5001
Server HTTP is running on port 3000
Consulta UTXO para: 04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d Entoces relleno los campos: Nueva Transacción (Coin Control)
Destinatario (Clave Pública):
Introduce la clave pública del destinatario
Cantidad:
0.00
window.walletAddress = data.publicKey; showToast("Wallet cargada. Dirección actualizada.", "success");

5000 (init-fund-1... #0)
Enviar Transacción y al clicar ese botón: <button type="submit">Enviar Transacción</button> Se inicia la Confirmar Transacción
¿Estás seguro de que deseas enviar 5 a:
0471ca059b715123afaf242935526cca823b8d3e64e3895a9b802df167e5875dbcc1151be36219e9fe18da04868f9b8845b8e185dd7ab5f46a3648b7ecbc2f4708 usando 1 UTXOs?

Confirmar Cancelar Si el usuario click en <button id="confirmBtn" style="margin-right: 10px;">Confirmar</button> Es cuando hace el check y el backend: ❌ Transacción rechazada: wallet sin clave privada {
address: '04f37be8504758e537f91e310792f7b09dca88be5b960c42abb100104dd655f72d4392441f6ea1c277ec996292f423ba1a6db7f02e646ef01d15def609e8538d0d'
} la recha. Una vez explicado el flujo, donde crees que sería mejor incluir el descifrado para firmar?

La opción más práctica y segura es agregar un campo input de passphrase en el frontend (por ejemplo, en el formulario de envío de transacción).
Así, el usuario introduce la passphrase cada vez que quiere firmar, y el frontend la envía al backend junto con los datos de la transacción.

Ventajas:

No almacenas la passphrase en el backend ni en el navegador.
El usuario puede usar wallets desde USB, local, o cualquier keystore compatible.
Es compatible con el flujo actual y fácil de implementar.
Alternativa USB:
Si el usuario tiene el keystore en un USB, el frontend puede leer el archivo y pedir la passphrase para descifrar y firmar localmente, pero para que el backend firme, igualmente necesita la passphrase.

Recomendación:
Agrega un campo input para la passphrase en el frontend y envíala al backend solo cuando se va a firmar una transacción.
¿Quieres que te ayude a adaptar el frontend y el backend para este flujo?

por que para que lo entienda, el backen ya tiene el keystore en el fichero C:\Users\maest\Documents\magnumsmaster\app\uploads\wallet_default.json, solo necesita descifrarlo? es así

Exacto:
El backend ya tiene el keystore en el archivo wallet_default.json.
Solo necesita la passphrase para descifrar la clave privada y poder firmar transacciones.

Sin la passphrase, el backend no puede descifrar el campo encryptedPrivateKey del keystore.
Por seguridad, la passphrase nunca se almacena en el backend, siempre debe ser proporcionada por el usuario cuando se va a firmar.

En resumen:

El backend lee el keystore del archivo.
El usuario envía la passphrase cuando quiere firmar.
El backend descifra la clave privada y firma la transacción.